// GEDCOM parser utility
// GEDCOM is the standard file format for genealogy data (Genealogical Data Communication)
//
// Maps GEDCOM 5.5 records onto NasabLink's data model:
//   INDI            -> Person (single `name`, `birthYear`/`deathYear`, `gender`)
//   NAME/TYPE Arabic-> Person.arabicName  (round-trips NasabLink's own GEDCOM export)
//   FAM HUSB/WIFE   -> SPOUSE relationship
//   FAM CHIL        -> PARENT_CHILD relationship
//
// NasabLink stores one parent per child, so a family's HUSB is taken as the
// child's parent and the WIFE is attached as that parent's spouse. This mirrors
// how TreeExportService writes GEDCOM out.

const GENERATION_NOTE = /^Generation:\s*-?\d+\s*$/i;

export class GedcomParser {
  constructor(gedcomText) {
    this.gedcomText = gedcomText;
    this.individuals = new Map();
    this.families = new Map();
  }

  parse() {
    const records = this.buildRecords();

    for (const record of records) {
      if (record.tag === 'INDI' && record.id) {
        this.individuals.set(record.id, this.readIndividual(record));
      } else if (record.tag === 'FAM' && record.id) {
        this.families.set(record.id, this.readFamily(record));
      }
    }

    return {
      individuals: Array.from(this.individuals.values()),
      families: Array.from(this.families.values()),
    };
  }

  /**
   * Turns flat GEDCOM lines into a nested record tree, so nested tags such as
   * BIRT > DATE are read from their real parent rather than from a running
   * "current tag" guess. CONT/CONC continuation lines fold into their parent.
   */
  buildRecords() {
    const roots = [];
    const stack = [];

    for (const rawLine of this.gedcomText.split(/\r?\n/)) {
      const line = this.parseLine(rawLine);
      if (!line) continue;

      if (line.level === 0) {
        const node = { tag: line.tag, value: line.value, id: line.id, children: [] };
        roots.push(node);
        stack.length = 0;
        stack[0] = node;
        continue;
      }

      const parent = stack[line.level - 1];
      if (!parent) continue; // malformed nesting — skip

      if (line.tag === 'CONT') {
        parent.value = `${parent.value}\n${line.value}`;
        continue;
      }
      if (line.tag === 'CONC') {
        parent.value = `${parent.value}${line.value}`;
        continue;
      }

      const node = { tag: line.tag, value: line.value, id: line.id, children: [] };
      parent.children.push(node);
      stack.length = line.level;
      stack[line.level] = node;
    }

    return roots;
  }

  parseLine(line) {
    const match = line.match(/^﻿?\s*(\d+)\s+(?:@([^@]+)@\s+)?(\w+)(?:\s(.*))?$/);
    if (!match) return null;

    return {
      level: parseInt(match[1], 10),
      id: match[2] ? `@${match[2]}@` : null,
      tag: match[3],
      value: (match[4] || '').trim(),
    };
  }

  child(node, tag) {
    return node.children.find(c => c.tag === tag) || null;
  }

  childValue(node, tag) {
    const found = this.child(node, tag);
    return found ? found.value : '';
  }

  readIndividual(record) {
    const individual = {
      id: record.id,
      name: '',
      arabicName: '',
      title: '',
      gender: null,
      birthYear: null,
      deathYear: null,
      placeOfOrigin: '',
      occupation: this.childValue(record, 'OCCU'),
      description: '',
      notes: '',
      hasDeathRecord: false,
    };

    // NasabLink's exporter writes the Arabic name as a second NAME with TYPE Arabic.
    for (const nameNode of record.children.filter(c => c.tag === 'NAME')) {
      const type = this.childValue(nameNode, 'TYPE').toLowerCase();
      const parsed = this.parseName(nameNode.value);
      if (type === 'arabic') {
        individual.arabicName = individual.arabicName || parsed;
      } else if (!individual.name) {
        individual.name = parsed;
        individual.title = this.childValue(nameNode, 'NPFX');
      }
    }

    const sex = this.childValue(record, 'SEX').trim().toUpperCase();
    if (sex === 'M') individual.gender = 'MALE';
    else if (sex === 'F') individual.gender = 'FEMALE';

    individual.title = individual.title || this.childValue(record, 'TITL');

    const birth = this.child(record, 'BIRT');
    if (birth) {
      individual.birthYear = this.parseYear(this.childValue(birth, 'DATE'));
      individual.placeOfOrigin = this.childValue(birth, 'PLAC');
    }

    const death = this.child(record, 'DEAT');
    if (death) {
      individual.hasDeathRecord = true;
      individual.deathYear = this.parseYear(this.childValue(death, 'DATE'));
    }

    // NasabLink exports `description` as the first NOTE, so read it back the same
    // way. "Generation: N" notes are export artifacts and are recomputed on import.
    const noteTexts = record.children
      .filter(c => c.tag === 'NOTE')
      .map(c => c.value.trim())
      .filter(v => v && !GENERATION_NOTE.test(v));

    individual.description = noteTexts.shift() || '';
    if (individual.occupation) noteTexts.push(`Occupation: ${individual.occupation}`);
    individual.notes = noteTexts.join('\n');

    return individual;
  }

  readFamily(record) {
    return {
      id: record.id,
      husband: this.childValue(record, 'HUSB') || null,
      wife: this.childValue(record, 'WIFE') || null,
      children: record.children.filter(c => c.tag === 'CHIL').map(c => c.value).filter(Boolean),
    };
  }

  parseName(nameValue) {
    // GEDCOM name format: FirstName /LastName/
    const match = nameValue.match(/^([^/]*)\s*\/([^/]*)\/(.*)$/);
    if (!match) return nameValue.trim();
    return [match[1].trim(), match[2].trim(), match[3].trim()].filter(Boolean).join(' ');
  }

  parseYear(dateValue) {
    // GEDCOM dates vary: "15 JAN 1980", "1980", "ABT 1980", "BET 1900 AND 1910".
    // NasabLink stores a year only, so take the first 4-digit year present.
    if (!dateValue) return null;
    const match = dateValue.match(/\b(\d{4})\b/);
    if (!match) return null;
    const year = parseInt(match[1], 10);
    return year >= 1 && year <= 2999 ? year : null;
  }

  /**
   * Produces an import plan shaped for NasabLink's API:
   *   people    — ordered so every person's parent is created before them
   *   marriages — HUSB/WIFE pairs to link once both people exist
   */
  convertToNasabLinkFormat() {
    const parsed = this.parse();

    const parentOf = new Map();   // childGedcomId -> parent gedcomId
    const marriages = [];
    let droppedSecondParents = 0;

    parsed.families.forEach(family => {
      const primaryParent = family.husband || family.wife;

      if (family.husband && family.wife) {
        marriages.push({ husbandGedcomId: family.husband, wifeGedcomId: family.wife });
      }

      family.children.forEach(childId => {
        if (!primaryParent || !this.individuals.has(primaryParent)) return;
        if (parentOf.has(childId)) return; // one parent per child — first family wins
        parentOf.set(childId, primaryParent);
        if (family.husband && family.wife) droppedSecondParents++;
      });
    });

    const byId = new Map(parsed.individuals.map(ind => [ind.id, ind]));
    const toPerson = ind => ({
      gedcomId: ind.id,
      parentGedcomId: parentOf.get(ind.id) || null,
      name: ind.name || 'Unknown',
      arabicName: ind.arabicName || null,
      title: ind.title || null,
      description: ind.description || null,
      gender: ind.gender || 'MALE',
      birthYear: ind.birthYear,
      deathYear: ind.deathYear,
      placeOfOrigin: ind.placeOfOrigin || null,
      notes: ind.notes || null,
      isLiving: ind.hasDeathRecord || ind.deathYear != null ? false : null,
    });

    // Parents must exist before their children, so walk top-down from the roots.
    const childrenOf = new Map();
    parentOf.forEach((parentId, childId) => {
      if (!childrenOf.has(parentId)) childrenOf.set(parentId, []);
      childrenOf.get(parentId).push(childId);
    });

    const ordered = [];
    const queued = new Set();
    const queue = parsed.individuals
      .filter(ind => !parentOf.has(ind.id) || !byId.has(parentOf.get(ind.id)))
      .map(ind => ind.id);
    queue.forEach(id => queued.add(id));

    while (queue.length) {
      const id = queue.shift();
      const individual = byId.get(id);
      if (!individual) continue;
      ordered.push(toPerson(individual));
      (childrenOf.get(id) || []).forEach(childId => {
        if (queued.has(childId)) return; // already scheduled — guards against cycles
        queued.add(childId);
        queue.push(childId);
      });
    }

    // Anything left is part of a parent cycle; import it as a root rather than drop it.
    parsed.individuals.forEach(ind => {
      if (queued.has(ind.id)) return;
      ordered.push({ ...toPerson(ind), parentGedcomId: null });
    });

    const rootCount = ordered.filter(p => !p.parentGedcomId).length;

    return {
      people: ordered,
      marriages,
      stats: {
        total: ordered.length,
        roots: rootCount,
        marriages: marriages.length,
        unknownGender: parsed.individuals.filter(i => !i.gender).length,
        droppedSecondParents,
      },
    };
  }
}

// Helper function to validate GEDCOM file
export const validateGedcomFile = (gedcomText) => {
  const errors = [];
  const warnings = [];

  if (!gedcomText || gedcomText.trim().length === 0) {
    errors.push('File is empty');
    return { valid: false, errors, warnings };
  }

  const lines = gedcomText.replace(/^﻿/, '').split(/\r?\n/);

  // Check for GEDCOM header
  if (!lines[0]?.includes('HEAD')) {
    warnings.push('Missing GEDCOM header (0 HEAD). File may not be standard GEDCOM format.');
  }

  // Check for individuals
  const hasIndividuals = lines.some(line => line.includes('INDI'));
  if (!hasIndividuals) {
    errors.push('No individuals found in file');
  }

  // Check file size (max 10MB)
  if (gedcomText.length > 10 * 1024 * 1024) {
    errors.push('File is too large (max 10MB)');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
};
