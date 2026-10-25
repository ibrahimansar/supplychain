using supplychain from '../db/schema';

@path: 'catalog'
service CatalogService {
  entity Products  as projection on supplychain.Products;
  entity Suppliers as projection on supplychain.Suppliers;
}
