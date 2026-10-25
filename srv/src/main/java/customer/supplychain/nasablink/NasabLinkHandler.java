package customer.supplychain.nasablink;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.sap.cds.Row;
import com.sap.cds.ql.CQL;
import com.sap.cds.ql.Insert;
import com.sap.cds.ql.cqn.AnalysisResult;
import com.sap.cds.ql.cqn.CqnAnalyzer;
import com.sap.cds.reflect.CdsModel;
import com.sap.cds.services.ErrorStatuses;
import com.sap.cds.services.ServiceException;
import com.sap.cds.services.cds.CdsUpdateEventContext;
import com.sap.cds.services.cds.CqnService;
import com.sap.cds.services.handler.EventHandler;
import com.sap.cds.services.handler.annotations.Before;
import com.sap.cds.services.handler.annotations.On;
import com.sap.cds.services.handler.annotations.ServiceName;
import com.sap.cds.services.persistence.PersistenceService;
import com.sap.cds.services.request.UserInfo;

import cds.gen.nasablinkservice.AddPersonContext;
import cds.gen.nasablinkservice.ChangeRoleContext;
import cds.gen.nasablinkservice.CreateTreeContext;
import cds.gen.nasablinkservice.DeleteTreeContext;
import cds.gen.nasablinkservice.FamilyTrees_;
import cds.gen.nasablinkservice.InviteMemberContext;
import cds.gen.nasablinkservice.LeaveTreeContext;
import cds.gen.nasablinkservice.MarkAllNotificationsReadContext;
import cds.gen.nasablinkservice.MeContext;
import cds.gen.nasablinkservice.Member;
import cds.gen.nasablinkservice.MembersContext;
import cds.gen.nasablinkservice.MyTree;
import cds.gen.nasablinkservice.MyTreesContext;
import cds.gen.nasablinkservice.PeopleAddSpouseContext;
import cds.gen.nasablinkservice.PeopleDeletePersonContext;
import cds.gen.nasablinkservice.PeopleRemoveSpouseContext;
import cds.gen.nasablinkservice.PeopleReorderContext;
import cds.gen.nasablinkservice.PeopleSetParentRelationshipTypeContext;
import cds.gen.nasablinkservice.People_;
import cds.gen.nasablinkservice.Profile;
import cds.gen.nasablinkservice.RemoveMemberContext;
import cds.gen.nasablinkservice.Result;
import cds.gen.nasablinkservice.SetLanguageContext;
import cds.gen.nasablinkservice.SetThemeContext;
import cds.gen.nasablinkservice.SetTreeTypeContext;
import cds.gen.nasablinkservice.StatsContext;
import cds.gen.nasablinkservice.TreeStats;

/**
 * Ports nasabLink's TreesController / TreesContentController / MeController business rules.
 * Everything runs against the PersistenceService with the CAP query builder.
 */
@Component
@ServiceName("NasabLinkService")
public class NasabLinkHandler implements EventHandler {

	private static final Set<String> LAYOUT_MODES = Set.of("VERTICAL", "HORIZONTAL", "ALTERNATING", "DYNAMIC");
	private static final Set<String> TREE_ROLES = Set.of("ADMIN", "VERIFIER", "VIEWER");
	private static final Pattern EMAIL = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");
	private static final String CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
	private static final SecureRandom RANDOM = new SecureRandom();

	@Autowired
	PersistenceService db;
	@Autowired
	TreeAccess access;

	private static String uid(com.sap.cds.services.EventContext ctx) {
		return ctx.getUserInfo().getName();
	}

	private static ServiceException bad(String msg) {
		return new ServiceException(ErrorStatuses.BAD_REQUEST, msg);
	}

	private static Result result(String status, String message) {
		Result r = Result.create();
		r.setStatus(status);
		r.setMessage(message);
		return r;
	}

	private static String blankToNull(String s) {
		return s == null || s.isBlank() ? null : s.trim();
	}

	// ------------------------------------------------------------------ profile

	@On(event = MeContext.CDS_NAME)
	public void me(MeContext ctx) {
		Row u = access.ensureUser(uid(ctx));
		UserInfo info = ctx.getUserInfo();
		Profile p = Profile.create();
		p.setId((String) u.get("ID"));
		p.setEmail((String) u.get("email"));
		p.setDisplayName((String) u.get("displayName"));
		p.setPhotoUrl((String) u.get("photoUrl"));
		p.setIsAdmin(info.hasRole("admin"));
		p.setThemePreference((String) u.get("themePreference"));
		p.setLanguagePreference((String) u.get("languagePreference"));
		ctx.setResult(p);
	}

	@On(event = SetLanguageContext.CDS_NAME)
	public void setLanguage(SetLanguageContext ctx) {
		access.ensureUser(uid(ctx));
		access.update(TreeAccess.USERS, uid(ctx), Map.of("languagePreference", ctx.getLanguage()));
		ctx.setResult(result("ok", "Language updated"));
	}

	@On(event = SetThemeContext.CDS_NAME)
	public void setTheme(SetThemeContext ctx) {
		access.ensureUser(uid(ctx));
		access.update(TreeAccess.USERS, uid(ctx), Map.of("themePreference", ctx.getTheme()));
		ctx.setResult(result("ok", "Theme updated"));
	}

	@On(event = MarkAllNotificationsReadContext.CDS_NAME)
	public void markAllRead(MarkAllNotificationsReadContext ctx) {
		db.run(com.sap.cds.ql.Update.entity(TreeAccess.NOTIFICATIONS).data("read", true)
				.where(n -> n.get("user_ID").eq(uid(ctx))));
		ctx.setResult(result("ok", "All notifications marked as read"));
	}

	// ------------------------------------------------------------------ trees

	private MyTree myTree(Row tree, String role, String userId) {
		MyTree t = MyTree.create();
		t.setTreeID((String) tree.get("ID"));
		t.setTreeName((String) tree.get("name"));
		t.setRole(role);
		t.setTreeType((String) tree.get("treeType"));
		t.setTemplateId((String) tree.get("templateId"));
		t.setVisibility((String) tree.get("visibility"));
		t.setIsOwner(userId.equals(tree.get("owner_ID")));
		return t;
	}

	@On(event = MyTreesContext.CDS_NAME)
	public void myTrees(MyTreesContext ctx) {
		String userId = uid(ctx);
		List<MyTree> out = new ArrayList<>();
		var memberships = db.run(com.sap.cds.ql.Select.from(TreeAccess.MEMBERSHIPS)
				.where(m -> m.get("user_ID").eq(userId))).list();
		for (Row m : memberships) {
			Row tree = access.findOne(TreeAccess.TREES, "ID", m.get("tree_ID"));
			if (tree != null && tree.get("deletedAt") == null) {
				out.add(myTree(tree, (String) m.get("role"), userId));
			}
		}
		out.sort((a, b) -> String.valueOf(a.getTreeName()).compareToIgnoreCase(String.valueOf(b.getTreeName())));
		ctx.setResult(out);
	}

	@On(event = CreateTreeContext.CDS_NAME)
	public void createTree(CreateTreeContext ctx) {
		String userId = uid(ctx);
		access.ensureUser(userId);
		String name = blankToNull(ctx.getName());
		if (name == null) {
			name = "My Family Tree";
		}
		if (name.length() > 100) {
			throw bad("Tree name must be 100 characters or less");
		}
		String type = ctx.getTreeType() == null ? "SIMPLE" : ctx.getTreeType().toUpperCase(Locale.ROOT);
		if (!Set.of("SIMPLE", "ADVANCED").contains(type)) {
			throw bad("Invalid tree type. Must be SIMPLE or ADVANCED");
		}
		String treeId = TreeAccess.newId();
		Map<String, Object> tree = new HashMap<>();
		tree.put("ID", treeId);
		tree.put("name", name);
		tree.put("description", blankToNull(ctx.getDescription()));
		tree.put("treeType", type);
		tree.put("templateId", ctx.getTemplateId() == null ? "family" : ctx.getTemplateId());
		tree.put("owner_ID", userId);
		db.run(Insert.into(TreeAccess.TREES).entry(tree));
		db.run(Insert.into(TreeAccess.MEMBERSHIPS).entry(
				Map.of("ID", TreeAccess.newId(), "tree_ID", treeId, "user_ID", userId, "role", "ADMIN")));

		Map<String, Object> root = new HashMap<>();
		root.put("ID", TreeAccess.newId());
		root.put("tree_ID", treeId);
		root.put("name", "Family Head");
		root.put("gender", "M");
		root.put("generation", 1);
		root.put("orderIndex", 0);
		root.put("publicCode", publicCode());
		root.put("description", "This is the root node of your family tree. You can edit this name and add family members below.");
		root.put("notes", "Click the edit icon to edit the name, add details, and start building your family tree.");
		db.run(Insert.into(TreeAccess.PEOPLE).entry(root));

		ctx.setResult(myTree(access.findOne(TreeAccess.TREES, "ID", treeId), "ADMIN", userId));
	}

	@On(event = DeleteTreeContext.CDS_NAME)
	public void deleteTree(DeleteTreeContext ctx) {
		String treeId = ctx.getTreeID();
		Row tree = access.requireTree(treeId);
		access.requireRole(treeId, uid(ctx), "ADMIN");
		if (!uid(ctx).equals(tree.get("owner_ID")) && !ctx.getUserInfo().hasRole("admin")) {
			throw new ServiceException(ErrorStatuses.FORBIDDEN, "Only the tree owner can delete this tree");
		}
		List<String> personIds = access.peopleOf(treeId).stream().map(p -> (String) p.get("ID")).toList();
		if (!personIds.isEmpty()) {
			db.run(com.sap.cds.ql.Delete.from(TreeAccess.RELATIONSHIPS)
					.where(r -> r.get("person1_ID").in(personIds).or(r.get("person2_ID").in(personIds))));
		}
		db.run(com.sap.cds.ql.Delete.from(TreeAccess.PEOPLE).where(p -> p.get("tree_ID").eq(treeId)));
		db.run(com.sap.cds.ql.Delete.from(TreeAccess.MEMBERSHIPS).where(m -> m.get("tree_ID").eq(treeId)));
		db.run(com.sap.cds.ql.Delete.from(TreeAccess.NOTIFICATIONS).where(n -> n.get("tree_ID").eq(treeId)));
		access.delete(TreeAccess.TREES, treeId);
		ctx.setResult(result("deleted", "Tree deleted"));
	}

	@On(event = SetTreeTypeContext.CDS_NAME)
	public void setTreeType(SetTreeTypeContext ctx) {
		Row tree = access.requireTree(ctx.getTreeID());
		if (!uid(ctx).equals(tree.get("owner_ID"))) {
			throw new ServiceException(ErrorStatuses.FORBIDDEN, "Only the tree owner can change the tree type");
		}
		String type = String.valueOf(ctx.getTreeType()).toUpperCase(Locale.ROOT);
		if (!Set.of("SIMPLE", "ADVANCED").contains(type)) {
			throw bad("treeType must be SIMPLE or ADVANCED");
		}
		if (type.equals(tree.get("treeType"))) {
			throw bad("Tree is already " + type.toLowerCase(Locale.ROOT));
		}
		access.update(TreeAccess.TREES, ctx.getTreeID(), Map.of("treeType", type));
		ctx.setResult(result("ok", "Tree type is now " + type));
	}

	@On(event = LeaveTreeContext.CDS_NAME)
	public void leaveTree(LeaveTreeContext ctx) {
		String userId = uid(ctx);
		Row tree = access.requireTree(ctx.getTreeID());
		if (access.roleOf(ctx.getTreeID(), userId) == null) {
			throw new ServiceException(ErrorStatuses.FORBIDDEN, "You are not a member of this tree");
		}
		if (userId.equals(tree.get("owner_ID"))) {
			throw new ServiceException(ErrorStatuses.UNPROCESSABLE_ENTITY, "Transfer ownership before leaving this tree");
		}
		deleteMembership(ctx.getTreeID(), userId);
		ctx.setResult(result("left", "You left the tree"));
	}

	private void deleteMembership(String treeId, String userId) {
		db.run(com.sap.cds.ql.Delete.from(TreeAccess.MEMBERSHIPS)
				.where(m -> m.get("tree_ID").eq(treeId).and(m.get("user_ID").eq(userId))));
	}

	// ------------------------------------------------------------------ members

	@On(event = MembersContext.CDS_NAME)
	public void members(MembersContext ctx) {
		String userId = uid(ctx);
		String role = access.requireRole(ctx.getTreeID(), userId, "ADMIN", "VERIFIER", "VIEWER");
		Row tree = access.requireTree(ctx.getTreeID());
		List<Member> out = new ArrayList<>();
		var rows = db.run(com.sap.cds.ql.Select.from(TreeAccess.MEMBERSHIPS)
				.where(m -> m.get("tree_ID").eq(ctx.getTreeID()))).list();
		for (Row m : rows) {
			String memberId = (String) m.get("user_ID");
			if ("VIEWER".equals(role) && !memberId.equals(userId)) {
				continue; // viewers only see themselves
			}
			Row u = access.findOne(TreeAccess.USERS, "ID", memberId);
			Member mem = Member.create();
			mem.setUserID(memberId);
			mem.setEmail(u == null ? null : (String) u.get("email"));
			mem.setDisplayName(u == null ? null : (String) u.get("displayName"));
			mem.setRole((String) m.get("role"));
			mem.setIsOwner(memberId.equals(tree.get("owner_ID")));
			out.add(mem);
		}
		ctx.setResult(out);
	}

	@On(event = InviteMemberContext.CDS_NAME)
	public void inviteMember(InviteMemberContext ctx) {
		String treeId = ctx.getTreeID();
		access.requireRole(treeId, uid(ctx), "ADMIN");
		Row tree = access.requireTree(treeId);
		String email = ctx.getEmail() == null ? "" : ctx.getEmail().trim().toLowerCase(Locale.ROOT);
		if (!EMAIL.matcher(email).matches()) {
			throw new ServiceException(ErrorStatuses.UNPROCESSABLE_ENTITY, "Please enter a valid email address");
		}
		String role = ctx.getRole() == null ? "" : ctx.getRole().toUpperCase(Locale.ROOT);
		if (!TREE_ROLES.contains(role)) {
			throw new ServiceException(ErrorStatuses.UNPROCESSABLE_ENTITY, "Role must be ADMIN, VERIFIER, or VIEWER");
		}
		Row user = db.run(com.sap.cds.ql.Select.from(TreeAccess.USERS).where(u -> u.get("email").eq(email)))
				.first().orElse(null);
		if (user == null) {
			// Pre-register the invitee. Their CAP user name is expected to equal the part before the '@'
			// (see me()); with a real IdP this should become the IdP user id on first login.
			String local = email.substring(0, email.indexOf('@'));
			String id = access.findOne(TreeAccess.USERS, "ID", local) == null ? local : email;
			db.run(Insert.into(TreeAccess.USERS).entry(Map.of("ID", id, "email", email, "displayName", local)));
			user = access.findOne(TreeAccess.USERS, "ID", id);
		}
		String memberId = (String) user.get("ID");
		String existing = access.roleOf(treeId, memberId);
		if (existing != null) {
			ctx.setResult(result("already_member", existing));
			return;
		}
		db.run(Insert.into(TreeAccess.MEMBERSHIPS).entry(
				Map.of("ID", TreeAccess.newId(), "tree_ID", treeId, "user_ID", memberId, "role", role)));
		access.notify(memberId, treeId, "TREE_ACCESS", "You were added to a tree",
				"You now have " + role.toLowerCase(Locale.ROOT) + " access to " + tree.get("name"), "/trees/" + treeId);
		ctx.setResult(result("added", "Member added"));
	}

	@On(event = ChangeRoleContext.CDS_NAME)
	public void changeRole(ChangeRoleContext ctx) {
		String treeId = ctx.getTreeID();
		access.requireRole(treeId, uid(ctx), "ADMIN");
		Row tree = access.requireTree(treeId);
		String role = ctx.getRole() == null ? "" : ctx.getRole().toUpperCase(Locale.ROOT);
		if (!TREE_ROLES.contains(role)) {
			throw new ServiceException(ErrorStatuses.UNPROCESSABLE_ENTITY, "Role must be ADMIN, VERIFIER, or VIEWER");
		}
		Row m = db.run(com.sap.cds.ql.Select.from(TreeAccess.MEMBERSHIPS)
				.where(x -> x.get("tree_ID").eq(treeId).and(x.get("user_ID").eq(ctx.getUserID())))).first().orElse(null);
		if (m == null) {
			throw new ServiceException(ErrorStatuses.NOT_FOUND, "Membership not found");
		}
		access.update(TreeAccess.MEMBERSHIPS, (String) m.get("ID"), Map.of("role", role));
		access.notify(ctx.getUserID(), treeId, "ROLE_CHANGED", "Role updated",
				"Your role in " + tree.get("name") + " was changed to " + role, "/trees/" + treeId);
		ctx.setResult(result("updated", role));
	}

	@On(event = RemoveMemberContext.CDS_NAME)
	public void removeMember(RemoveMemberContext ctx) {
		String treeId = ctx.getTreeID();
		access.requireRole(treeId, uid(ctx), "ADMIN");
		Row tree = access.requireTree(treeId);
		if (access.roleOf(treeId, ctx.getUserID()) == null) {
			throw new ServiceException(ErrorStatuses.NOT_FOUND, "Membership not found");
		}
		if (ctx.getUserID().equals(tree.get("owner_ID"))) {
			throw new ServiceException(ErrorStatuses.UNPROCESSABLE_ENTITY, "The default admin (owner) cannot be removed");
		}
		access.notify(ctx.getUserID(), null, "REMOVED_FROM_TREE", "Removed from tree",
				"You were removed from " + tree.get("name"), "/trees");
		deleteMembership(treeId, ctx.getUserID());
		ctx.setResult(result("removed", "Member removed"));
	}

	@On(event = StatsContext.CDS_NAME)
	public void stats(StatsContext ctx) {
		String treeId = ctx.getTreeID();
		access.requireRole(treeId, uid(ctx), "ADMIN");
		TreeGraph g = new TreeGraph(access.peopleOf(treeId), access.relationshipsOf(treeId));
		int male = 0, female = 0, maxGen = 0;
		for (Row p : g.people.values()) {
			if ("M".equals(p.get("gender"))) male++;
			if ("F".equals(p.get("gender"))) female++;
			if (p.get("generation") != null) maxGen = Math.max(maxGen, ((Number) p.get("generation")).intValue());
		}
		long parents = g.children.keySet().size();
		long edges = g.children.values().stream().mapToInt(List::size).sum();
		TreeStats s = TreeStats.create();
		s.setTotalPersons(g.people.size());
		s.setMaxGeneration(maxGen);
		s.setMale(male);
		s.setFemale(female);
		s.setParentCount((int) parents);
		s.setLeafCount((int) Math.max(0, g.people.size() - parents));
		s.setAvgChildrenPerParent(parents == 0 ? 0.0 : (double) edges / parents);
		var roles = db.run(com.sap.cds.ql.Select.from(TreeAccess.MEMBERSHIPS).where(m -> m.get("tree_ID").eq(treeId))).list();
		s.setAdmins((int) roles.stream().filter(r -> "ADMIN".equals(r.get("role"))).count());
		s.setVerifiers((int) roles.stream().filter(r -> "VERIFIER".equals(r.get("role"))).count());
		s.setViewers((int) roles.stream().filter(r -> "VIEWER".equals(r.get("role"))).count());
		ctx.setResult(s);
	}

	@Before(event = CqnService.EVENT_UPDATE, entity = FamilyTrees_.CDS_NAME)
	public void validateTreeUpdate(CdsUpdateEventContext ctx, List<cds.gen.nasablinkservice.FamilyTrees> rows) {
		for (var t : rows) {
			if (t.containsKey("name") && (t.getName() == null || t.getName().isBlank() || t.getName().length() > 100)) {
				throw new ServiceException(ErrorStatuses.UNPROCESSABLE_ENTITY, "Tree name must be 1-100 characters");
			}
			if (t.getDescription() != null && t.getDescription().length() > 500) {
				throw new ServiceException(ErrorStatuses.UNPROCESSABLE_ENTITY, "Description must be 500 characters or less");
			}
			if (t.getLayoutMode() != null && !LAYOUT_MODES.contains(t.getLayoutMode())) {
				throw new ServiceException(ErrorStatuses.UNPROCESSABLE_ENTITY,
						"layoutMode must be one of " + String.join(", ", LAYOUT_MODES));
			}
			if (t.containsKey("treeType") || t.containsKey("ownerId") || t.containsKey("owner_ID")) {
				throw bad("Use the setTreeType action; the owner cannot be changed here");
			}
		}
	}

	// ------------------------------------------------------------------ people

	private static String publicCode() {
		StringBuilder sb = new StringBuilder(8);
		for (int i = 0; i < 8; i++) {
			sb.append(CODE_ALPHABET.charAt(RANDOM.nextInt(CODE_ALPHABET.length())));
		}
		return sb.toString();
	}

	private static String normalizeLayout(String v) {
		if (v == null || v.isBlank()) return null;
		String u = v.trim().toUpperCase(Locale.ROOT);
		return Set.of("VERTICAL", "HORIZONTAL").contains(u) ? u : null;
	}

	private static String normalizeGender(String g) {
		if (g == null) return null;
		return switch (g.trim().toUpperCase(Locale.ROOT)) {
			case "M", "MALE" -> "M";
			case "F", "FEMALE" -> "F";
			default -> throw bad("Unknown gender: " + g);
		};
	}

	private void recomputeGenerations(String treeId) {
		TreeGraph g = new TreeGraph(access.peopleOf(treeId), access.relationshipsOf(treeId));
		g.computeGenerations().forEach((id, gen) -> {
			Integer old = (Integer) g.people.get(id).get("generation");
			if (!gen.equals(old)) {
				access.update(TreeAccess.PEOPLE, id, Map.of("generation", gen));
			}
		});
	}

	@On(event = AddPersonContext.CDS_NAME)
	public void addPerson(AddPersonContext ctx) {
		String treeId = ctx.getTreeID();
		access.requireRole(treeId, uid(ctx), "ADMIN", "VERIFIER");
		access.requireTree(treeId);
		if (ctx.getName() == null || ctx.getName().isBlank() || ctx.getGender() == null) {
			throw bad("Name and gender are required");
		}
		Map<String, Object> p = new HashMap<>();
		String personId = TreeAccess.newId();
		p.put("ID", personId);
		p.put("tree_ID", treeId);
		p.put("name", ctx.getName().trim());
		p.put("gender", normalizeGender(ctx.getGender()));
		p.put("birthYear", ctx.getBirthYear());
		p.put("deathYear", ctx.getDeathYear());
		p.put("arabicName", ctx.getArabicName());
		p.put("title", ctx.getTitle());
		p.put("description", ctx.getDescription());
		p.put("childLayout", normalizeLayout(ctx.getChildLayout()));
		p.put("honorificName", blankToNull(ctx.getHonorificName()));
		p.put("epithet", blankToNull(ctx.getEpithet()));
		p.put("patronymic", blankToNull(ctx.getPatronymic()));
		p.put("clanName", blankToNull(ctx.getClanName()));
		p.put("customFields", ctx.getCustomFields());
		p.put("publicCode", publicCode());

		TreeGraph g = new TreeGraph(access.peopleOf(treeId), access.relationshipsOf(treeId));
		String parentId = ctx.getParentID();
		String childId = ctx.getChildID();

		if (childId != null && parentId == null) {
			// "Add parent" mode: new person becomes the parent of an existing, parent-less person.
			Row child = g.people.get(childId);
			if (child == null) throw bad("Child person does not belong to this tree");
			if (g.hasParent.contains(childId)) throw bad("This person already has a parent in the tree");
			p.put("orderIndex", 0);
			db.run(Insert.into(TreeAccess.PEOPLE).entry(p));
			db.run(Insert.into(TreeAccess.RELATIONSHIPS).entry(Map.of("ID", TreeAccess.newId(), "type", "PARENT_CHILD",
					"person1_ID", personId, "person2_ID", childId, "parentRelationshipType", "BIOLOGICAL")));
		} else {
			if (parentId != null) {
				Row parent = g.people.get(parentId);
				if (parent == null) throw bad("Parent does not belong to this tree");
				if (Boolean.TRUE.equals(parent.get("noHeir"))) {
					throw bad("Cannot add children to a person marked as 'no heir'");
				}
				int max = g.childrenOf(parentId).stream().mapToInt(c -> TreeGraph.order(g.people.get(c))).max().orElse(-1);
				p.put("orderIndex", max + 1);
				db.run(Insert.into(TreeAccess.PEOPLE).entry(p));
				Map<String, Object> rel = new HashMap<>(Map.of("ID", TreeAccess.newId(), "type", "PARENT_CHILD",
						"person1_ID", parentId, "person2_ID", personId, "parentRelationshipType", "BIOLOGICAL"));
				// co-parent must be one of the parent's spouses
				if (ctx.getCoParentID() != null && g.spouses.getOrDefault(parentId, List.of()).contains(ctx.getCoParentID())) {
					rel.put("coParent_ID", ctx.getCoParentID());
				}
				db.run(Insert.into(TreeAccess.RELATIONSHIPS).entry(rel));
			} else {
				p.put("orderIndex", 0);
				db.run(Insert.into(TreeAccess.PEOPLE).entry(p));
			}
		}
		recomputeGenerations(treeId);
		ctx.setResult(db.run(com.sap.cds.ql.Select.from(People_.class).where(x -> x.ID().eq(personId)))
				.single(cds.gen.nasablinkservice.People.class));
	}

	private String personId(CdsModel model, com.sap.cds.ql.cqn.CqnSelect target) {
		AnalysisResult r = CqnAnalyzer.create(model).analyze(target.ref());
		return (String) r.targetKeys().get("ID");
	}

	/** Loads the person for a bound action and checks the caller may edit its tree. */
	private Row editablePerson(com.sap.cds.services.EventContext ctx, String personId) {
		Row p = access.requirePerson(personId);
		access.requireRole((String) p.get("tree_ID"), uid(ctx), "ADMIN", "VERIFIER");
		return p;
	}

	@On(event = PeopleDeletePersonContext.CDS_NAME, entity = People_.CDS_NAME)
	public void deletePerson(PeopleDeletePersonContext ctx) {
		String id = personId(ctx.getModel(), ctx.getCqn());
		Row person = editablePerson(ctx, id);
		String treeId = (String) person.get("tree_ID");
		TreeGraph g = new TreeGraph(access.peopleOf(treeId), access.relationshipsOf(treeId));
		if (id.equals(g.dominantRoot())) {
			throw bad("Cannot delete the root node of a family tree");
		}
		// the person plus every descendant
		Set<String> doomed = new java.util.LinkedHashSet<>(List.of(id));
		java.util.ArrayDeque<String> q = new java.util.ArrayDeque<>(List.of(id));
		while (!q.isEmpty()) {
			for (String c : g.children.getOrDefault(q.poll(), List.of())) {
				if (doomed.add(c)) q.add(c);
			}
		}
		List<String> ids = new ArrayList<>(doomed);
		db.run(com.sap.cds.ql.Delete.from(TreeAccess.RELATIONSHIPS)
				.where(r -> r.get("person1_ID").in(ids).or(r.get("person2_ID").in(ids)).or(r.get("coParent_ID").in(ids))));
		db.run(com.sap.cds.ql.Delete.from(TreeAccess.PEOPLE).where(p -> p.get("ID").in(ids)));
		recomputeGenerations(treeId);
		ctx.setResult(result("deleted", doomed.size() + " person(s) deleted"));
	}

	@On(event = PeopleAddSpouseContext.CDS_NAME, entity = People_.CDS_NAME)
	public void addSpouse(PeopleAddSpouseContext ctx) {
		String id = personId(ctx.getModel(), ctx.getCqn());
		String spouseId = ctx.getSpouseID();
		Row person = editablePerson(ctx, id);
		String treeId = (String) person.get("tree_ID");
		if (id.equals(spouseId)) throw bad("Cannot marry self");
		Row spouse = access.requirePerson(spouseId);
		if (!treeId.equals(spouse.get("tree_ID"))) throw bad("Spouse does not belong to this tree");
		TreeGraph g = new TreeGraph(access.peopleOf(treeId), access.relationshipsOf(treeId));
		// one spouse per person (nasabLink's default; the 'multiple spouses' tree setting is not ported)
		if (!g.spouses.getOrDefault(id, List.of()).isEmpty()) throw bad("Person already has a spouse");
		if (!g.spouses.getOrDefault(spouseId, List.of()).isEmpty()) throw bad("Spouse already has a spouse");
		db.run(Insert.into(TreeAccess.RELATIONSHIPS).entry(
				Map.of("ID", TreeAccess.newId(), "type", "SPOUSE", "person1_ID", id, "person2_ID", spouseId)));
		recomputeGenerations(treeId);
		ctx.setResult(result("ok", "Spouse linked"));
	}

	@On(event = PeopleRemoveSpouseContext.CDS_NAME, entity = People_.CDS_NAME)
	public void removeSpouse(PeopleRemoveSpouseContext ctx) {
		String id = personId(ctx.getModel(), ctx.getCqn());
		Row person = editablePerson(ctx, id);
		TreeGraph g = new TreeGraph(access.peopleOf((String) person.get("tree_ID")),
				access.relationshipsOf((String) person.get("tree_ID")));
		if (g.spouses.getOrDefault(id, List.of()).isEmpty()) throw bad("Person has no spouse to remove");
		db.run(com.sap.cds.ql.Delete.from(TreeAccess.RELATIONSHIPS)
				.where(r -> r.get("type").eq("SPOUSE").and(r.get("person1_ID").eq(id).or(r.get("person2_ID").eq(id)))));
		recomputeGenerations((String) person.get("tree_ID"));
		ctx.setResult(result("ok", "Spouse unlinked"));
	}

	@On(event = PeopleReorderContext.CDS_NAME, entity = People_.CDS_NAME)
	public void reorder(PeopleReorderContext ctx) {
		String id = personId(ctx.getModel(), ctx.getCqn());
		Row person = editablePerson(ctx, id);
		String treeId = (String) person.get("tree_ID");
		TreeGraph g = new TreeGraph(access.peopleOf(treeId), access.relationshipsOf(treeId));
		String parent = g.children.entrySet().stream().filter(e -> e.getValue().contains(id))
				.map(Map.Entry::getKey).findFirst().orElseThrow(() -> bad("Cannot reorder root person"));
		List<String> sibs = g.childrenOf(parent);
		sibs.remove(id);
		int idx = Math.max(0, Math.min(ctx.getNewIndex() == null ? 0 : ctx.getNewIndex(), sibs.size()));
		sibs.add(idx, id);
		for (int i = 0; i < sibs.size(); i++) {
			access.update(TreeAccess.PEOPLE, sibs.get(i), Map.of("orderIndex", i));
		}
		ctx.setResult(result("ok", "Reordered"));
	}

	@On(event = PeopleSetParentRelationshipTypeContext.CDS_NAME, entity = People_.CDS_NAME)
	public void setParentRelationshipType(PeopleSetParentRelationshipTypeContext ctx) {
		String id = personId(ctx.getModel(), ctx.getCqn());
		editablePerson(ctx, id);
		String type = ctx.getType() == null ? "BIOLOGICAL" : ctx.getType().toUpperCase(Locale.ROOT);
		if (!Set.of("BIOLOGICAL", "STEP", "KAFALA", "ADOPTIVE").contains(type)) type = "BIOLOGICAL";
		db.run(com.sap.cds.ql.Update.entity(TreeAccess.RELATIONSHIPS).data("parentRelationshipType", type)
				.where(r -> r.get("type").eq("PARENT_CHILD").and(r.get("person2_ID").eq(id))));
		ctx.setResult(result("ok", type));
	}

	/** PATCH on a person: the @restrict already requires a non-viewer role; add nasabLink's field rules. */
	@Before(event = CqnService.EVENT_UPDATE, entity = People_.CDS_NAME)
	public void validatePersonUpdate(CdsUpdateEventContext ctx, List<cds.gen.nasablinkservice.People> rows) {
		for (var p : rows) {
			if (p.containsKey("tree_ID") || p.containsKey("tree")) {
				throw bad("A person cannot be moved to another tree");
			}
			if (p.containsKey("name") && (p.getName() == null || p.getName().isBlank())) {
				throw bad("Name must not be empty");
			}
			if (p.containsKey("gender") && p.getGender() != null) {
				p.setGender(normalizeGender(p.getGender()));
			}
			if (p.containsKey("generation") && (p.getGeneration() == null || p.getGeneration() < 1)) {
				p.remove("generation");
			}
			if (p.containsKey("childLayout")) {
				p.setChildLayout(normalizeLayout(p.getChildLayout()));
			}
			if (Boolean.TRUE.equals(p.getNoHeir()) && p.getId() != null) {
				Row row = access.requirePerson(p.getId());
				TreeGraph g = new TreeGraph(access.peopleOf((String) row.get("tree_ID")),
						access.relationshipsOf((String) row.get("tree_ID")));
				if (!g.children.getOrDefault(p.getId(), List.of()).isEmpty()) {
					throw bad("Cannot mark as 'no heir' - person already has children. Remove children first.");
				}
			}
		}
	}
}
