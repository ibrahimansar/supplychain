package customer.supplychain.nasablink;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.sap.cds.Row;
import com.sap.cds.ql.Delete;
import com.sap.cds.ql.Insert;
import com.sap.cds.ql.Select;
import com.sap.cds.ql.Update;
import com.sap.cds.services.ErrorStatuses;
import com.sap.cds.services.ServiceException;
import com.sap.cds.services.persistence.PersistenceService;

/**
 * Shared DB helpers. Tree roles (ADMIN / VERIFIER / VIEWER) live in the Memberships table,
 * so they are checked here instead of through global CAP roles.
 */
@Component
public class TreeAccess {

	public static final String USERS = "nasablink.Users";
	public static final String TREES = "nasablink.FamilyTrees";
	public static final String MEMBERSHIPS = "nasablink.Memberships";
	public static final String PEOPLE = "nasablink.People";
	public static final String RELATIONSHIPS = "nasablink.Relationships";
	public static final String NOTIFICATIONS = "nasablink.Notifications";

	@Autowired
	PersistenceService db;

	public static String newId() {
		return UUID.randomUUID().toString();
	}

	public Row findOne(String entity, String key, Object value) {
		return db.run(Select.from(entity).where(e -> e.get(key).eq(value))).first().orElse(null);
	}

	public String roleOf(String treeId, String userId) {
		return db.run(Select.from(MEMBERSHIPS)
				.where(m -> m.get("tree_ID").eq(treeId).and(m.get("user_ID").eq(userId))))
				.first().map(r -> (String) r.get("role")).orElse(null);
	}

	/** Returns the caller's role in the tree or throws 403 if it is not one of {@code allowed}. */
	public String requireRole(String treeId, String userId, String... allowed) {
		String role = roleOf(treeId, userId);
		if (role == null || !Arrays.asList(allowed).contains(role)) {
			throw new ServiceException(ErrorStatuses.FORBIDDEN, "You do not have permission for this tree");
		}
		return role;
	}

	public Row requireTree(String treeId) {
		Row tree = findOne(TREES, "ID", treeId);
		if (tree == null) {
			throw new ServiceException(ErrorStatuses.NOT_FOUND, "Tree not found");
		}
		return tree;
	}

	public Row requirePerson(String personId) {
		Row p = findOne(PEOPLE, "ID", personId);
		if (p == null) {
			throw new ServiceException(ErrorStatuses.NOT_FOUND, "Person not found");
		}
		return p;
	}

	/** Creates the Users row on first sight of a CAP user (replaces nasabLink's Firebase sign-up). */
	public Row ensureUser(String userId) {
		Row u = findOne(USERS, "ID", userId);
		if (u == null) {
			db.run(Insert.into(USERS).entry(Map.of("ID", userId, "email", userId + "@nasablink.local",
					"displayName", userId)));
			u = findOne(USERS, "ID", userId);
		}
		return u;
	}

	public List<Row> peopleOf(String treeId) {
		return db.run(Select.from(PEOPLE).where(p -> p.get("tree_ID").eq(treeId))).list();
	}

	public List<Row> relationshipsOf(String treeId) {
		return db.run(Select.from(RELATIONSHIPS).where(r -> r.get("person1.tree_ID").eq(treeId))).list();
	}

	public void notify(String userId, String treeId, String type, String title, String message, String link) {
		Map<String, Object> n = new java.util.HashMap<>();
		n.put("ID", newId());
		n.put("user_ID", userId);
		n.put("tree_ID", treeId);
		n.put("type", type);
		n.put("title", title);
		n.put("message", message);
		n.put("link", link);
		n.put("read", false);
		db.run(Insert.into(NOTIFICATIONS).entry(n));
	}

	public void update(String entity, String id, Map<String, Object> data) {
		db.run(Update.entity(entity).data(data).where(e -> e.get("ID").eq(id)));
	}

	public void delete(String entity, String id) {
		db.run(Delete.from(entity).where(e -> e.get("ID").eq(id)));
	}
}
