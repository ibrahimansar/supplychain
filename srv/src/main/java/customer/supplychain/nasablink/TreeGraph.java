package customer.supplychain.nasablink;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Deque;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import com.sap.cds.Row;

/** In-memory view of one tree's people and relationships (ports GenerationService / getRoot). */
class TreeGraph {

	final Map<String, Row> people = new HashMap<>();
	final Map<String, List<String>> children = new HashMap<>();
	final Map<String, List<String>> spouses = new HashMap<>();
	final Set<String> hasParent = new HashSet<>();

	TreeGraph(List<Row> persons, List<Row> rels) {
		for (Row p : persons) {
			people.put((String) p.get("ID"), p);
		}
		for (Row r : rels) {
			String a = (String) r.get("person1_ID");
			String b = (String) r.get("person2_ID");
			if (!people.containsKey(a) || !people.containsKey(b)) {
				continue;
			}
			if ("PARENT_CHILD".equals(r.get("type"))) {
				children.computeIfAbsent(a, k -> new ArrayList<>()).add(b);
				hasParent.add(b);
			} else {
				spouses.computeIfAbsent(a, k -> new ArrayList<>()).add(b);
				spouses.computeIfAbsent(b, k -> new ArrayList<>()).add(a);
			}
		}
	}

	List<String> childrenOf(String id) {
		List<String> kids = new ArrayList<>(children.getOrDefault(id, List.of()));
		kids.sort(Comparator.comparingInt(k -> order(people.get(k))));
		return kids;
	}

	static int order(Row p) {
		Object o = p.get("orderIndex");
		return o == null ? 0 : ((Number) o).intValue();
	}

	/** Parent-less people who are not married to someone that has a parent (in-laws attach to their partner). */
	List<String> roots() {
		List<String> roots = new ArrayList<>();
		for (String id : people.keySet()) {
			if (hasParent.contains(id)) {
				continue;
			}
			boolean marriedIntoTree = spouses.getOrDefault(id, List.of()).stream().anyMatch(hasParent::contains);
			if (!marriedIntoTree) {
				roots.add(id);
			}
		}
		return roots;
	}

	int descendants(String id) {
		Set<String> seen = new HashSet<>();
		Deque<String> q = new ArrayDeque<>(List.of(id));
		while (!q.isEmpty()) {
			for (String c : children.getOrDefault(q.poll(), List.of())) {
				if (seen.add(c)) {
					q.add(c);
				}
			}
		}
		return seen.size();
	}

	/** The parent-less person with the largest descendant subtree, or null for an empty tree. */
	String dominantRoot() {
		return roots().stream().max(Comparator.comparingInt(this::descendants)).orElse(null);
	}

	/** generation per person: roots = 1, children = parent + 1, spouses share their partner's generation. */
	Map<String, Integer> computeGenerations() {
		Map<String, Integer> gen = new HashMap<>();
		Deque<String> q = new ArrayDeque<>();
		for (String r : roots()) {
			gen.put(r, 1);
			q.add(r);
		}
		while (!q.isEmpty()) {
			String id = q.poll();
			int g = gen.get(id);
			for (String c : children.getOrDefault(id, List.of())) {
				if (!gen.containsKey(c)) {
					gen.put(c, g + 1);
					q.add(c);
				}
			}
			for (String s : spouses.getOrDefault(id, List.of())) {
				if (!gen.containsKey(s)) {
					gen.put(s, g);
					q.add(s);
				}
			}
		}
		for (String id : people.keySet()) {
			gen.putIfAbsent(id, 1);
		}
		return gen;
	}
}
