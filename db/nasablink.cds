namespace nasablink;

using { cuid, managed } from '@sap/cds/common';

type TreeRole       : String(10) enum { ADMIN; VERIFIER; VIEWER; };
type TreeType       : String(10) enum { SIMPLE; ADVANCED; };
type TreeVisibility : String(10) enum { PRIVATE; UNLISTED; PUBLIC; };
type Gender         : String(1)  enum { M; F; };
type RelationType   : String(12) enum { PARENT_CHILD; SPOUSE; };
type ParentRelType  : String(10) enum { BIOLOGICAL; STEP; KAFALA; ADOPTIVE; };

// Application user. ID is the CAP user name (xsuaa / mock user), replacing nasabLink's
// Firebase uid + UUID. Rows are created on first call of NasabLinkService.me().
entity Users {
  key ID              : String(100);
  email               : String(255);
  displayName         : String(255);
  photoUrl            : String(500);
  themePreference     : String(10) default 'light';
  languagePreference  : String(10) default 'en';
  subscriptionStatus  : String(10) default 'FREE';
}

entity FamilyTrees : cuid, managed {
  name         : String(255) @mandatory;
  description  : String(500);
  region       : String(100);
  treeType     : TreeType default 'SIMPLE';
  visibility   : TreeVisibility default 'PRIVATE';
  layoutMode   : String(20) default 'VERTICAL';
  templateId   : String(64) default 'family';
  deletedAt    : Timestamp;
  settings     : LargeString;                       // JSON text (was a JSON column)
  owner        : Association to Users;
  memberships  : Composition of many Memberships on memberships.tree = $self;
  people       : Composition of many People on people.tree = $self;
}

entity Memberships : cuid {
  tree  : Association to FamilyTrees @mandatory;
  user  : Association to Users @mandatory;
  role  : TreeRole default 'VIEWER';
}

entity People : cuid, managed {
  tree            : Association to FamilyTrees @mandatory;
  publicCode      : String(32);
  name            : String(255) @mandatory;
  arabicName      : String(255);
  title           : String(255);
  description     : LargeString;
  notes           : LargeString;
  birthYear       : Integer;
  deathYear       : Integer;
  gender          : Gender;
  generation      : Integer;
  orderIndex      : Integer default 0;
  noHeir          : Boolean default false;
  isLiving        : Boolean;
  placeOfOrigin   : String(255);
  childLayout     : String(20);
  honorificName   : String(255);
  epithet         : String(255);
  patronymic      : LargeString;
  clanName        : String(255);
  customFields    : LargeString;                    // JSON text
}

// PARENT_CHILD: person1 = parent, person2 = child. SPOUSE: unordered pair.
entity Relationships : cuid {
  type                   : RelationType @mandatory;
  person1                : Association to People @mandatory;
  person2                : Association to People @mandatory;
  parentRelationshipType : ParentRelType;
  coParent               : Association to People;
}

entity Notifications : cuid {
  user      : Association to Users @mandatory;
  tree      : Association to FamilyTrees;
  type      : String(32);
  title     : String(255);
  message   : LargeString;
  link      : String(500);
  read      : Boolean default false;
  createdAt : Timestamp @cds.on.insert: $now;
}
