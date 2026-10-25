namespace supplychain;

using { cuid, managed } from '@sap/cds/common';

entity Suppliers : cuid, managed {
  name    : String(100) @mandatory;
  city    : String(100);
  country : String(100);
  products : Association to many Products on products.supplier = $self;
}

entity Products : cuid, managed {
  name     : String(100) @mandatory;
  category : String(50);
  price    : Decimal(10,2);
  stock    : Integer;
  supplier : Association to Suppliers;
}
