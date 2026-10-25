using nasablink from '../db/nasablink';

// OData V4 at /odata/v4/nasablink.
// Plain CRUD covers reading and simple edits; anything with business rules
// (generation numbering, sibling order, tree membership, cascading deletes) is an action.
// Per-tree access (ADMIN / VERIFIER / VIEWER) cannot be a global CAP role, so it is
// enforced instance-based: @restrict where-clauses for reads, handler checks for writes.
@path: 'nasablink'
@requires: 'authenticated-user'
service NasabLinkService {

  type Profile {
    id                 : String;
    email              : String;
    displayName        : String;
    photoUrl           : String;
    isAdmin            : Boolean;
    themePreference    : String;
    languagePreference : String;
  }

  type MyTree {
    treeID      : UUID;
    treeName    : String;
    role        : String;
    treeType    : String;
    templateId  : String;
    isOwner     : Boolean;
    visibility  : String;
  }

  type Member {
    userID      : String;
    email       : String;
    displayName : String;
    role        : String;
    isOwner     : Boolean;
  }

  type TreeStats {
    totalPersons         : Integer;
    maxGeneration        : Integer;
    male                 : Integer;
    female               : Integer;
    leafCount            : Integer;
    parentCount          : Integer;
    avgChildrenPerParent : Double;
    admins               : Integer;
    verifiers            : Integer;
    viewers              : Integer;
  }

  type Result { status : String; message : String; }

  // ---- readable data (members of the tree only) ----
  @restrict: [
    { grant: 'READ',   where: 'exists memberships[user.ID = $user]' },
    { grant: 'UPDATE', where: 'exists memberships[user.ID = $user and role = ''ADMIN'']' }
  ]
  entity FamilyTrees as projection on nasablink.FamilyTrees excluding { settings } ;

  @restrict: [
    { grant: 'READ',   where: 'exists tree.memberships[user.ID = $user]' },
    { grant: ['UPDATE','deletePerson','addSpouse','removeSpouse','reorder','setParentRelationshipType'],
      where: 'exists tree.memberships[user.ID = $user and role <> ''VIEWER'']' }
  ]
  entity People as projection on nasablink.People actions {
    action deletePerson()                          returns Result;
    action addSpouse(spouseID : UUID)              returns Result;
    action removeSpouse()                          returns Result;
    action reorder(newIndex : Integer)             returns Result;
    action setParentRelationshipType(type : String) returns Result;
  };

  @readonly
  @restrict: [{ grant: 'READ', where: 'exists person1.tree.memberships[user.ID = $user]' }]
  entity Relationships as projection on nasablink.Relationships;

  // A viewer sees only themselves; ADMIN / VERIFIER see everybody in the tree (see members()).
  @readonly
  @restrict: [{ grant: 'READ', where: 'user.ID = $user' }]
  entity Memberships as projection on nasablink.Memberships;

  @restrict: [{ grant: ['READ','UPDATE','DELETE'], where: 'user.ID = $user' }]
  entity Notifications as projection on nasablink.Notifications;

  // ---- unbound operations ----
  function me()                              returns Profile;
  function myTrees()                         returns array of MyTree;
  function members(treeID : UUID)            returns array of Member;
  function stats(treeID : UUID)              returns TreeStats;

  action createTree(name : String, description : String, treeType : String,
                    templateId : String)     returns MyTree;
  action deleteTree(treeID : UUID)           returns Result;
  action leaveTree(treeID : UUID)            returns Result;
  action setTreeType(treeID : UUID, treeType : String) returns Result;
  action inviteMember(treeID : UUID, email : String, role : String) returns Result;
  action changeRole(treeID : UUID, userID : String, role : String)  returns Result;
  action removeMember(treeID : UUID, userID : String)               returns Result;
  action setLanguage(language : String)      returns Result;
  action setTheme(theme : String)            returns Result;

  action addPerson(treeID : UUID, name : String, gender : String, birthYear : Integer,
                   deathYear : Integer, arabicName : String, title : String,
                   description : String, childLayout : String,
                   parentID : UUID, childID : UUID, coParentID : UUID,
                   honorificName : String, epithet : String, patronymic : String,
                   clanName : String, customFields : String) returns People;
  action markAllNotificationsRead()          returns Result;
}
