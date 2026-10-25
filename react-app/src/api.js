const BASE = '/odata/v4/catalog';

async function request(path, options) {
  const res = await fetch(`${BASE}${path}`, options);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.status === 204 ? null : res.json();
}

export async function listProducts(search) {
  const params = new URLSearchParams({ $expand: 'supplier', $orderby: 'name' });
  if (search) params.set('$filter', `contains(tolower(name),'${search.toLowerCase().replace(/'/g, "''")}')`);
  return (await request(`/Products?${params}`)).value;
}

export async function listSuppliers() {
  return (await request('/Suppliers?$orderby=name')).value;
}
