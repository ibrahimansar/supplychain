import { useEffect, useState } from 'react';
import { listProducts, listSuppliers } from './api.js';

function Products() {
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    listProducts(search).then(setRows).catch(setError);
  }, [search]);

  return (
    <>
      <input placeholder="Search by name" value={search} onChange={(e) => setSearch(e.target.value)} />
      {error && <p className="error">{error.message}</p>}
      <table>
        <thead>
          <tr><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Supplier</th></tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.ID} onClick={() => setSelected(p)} className={selected?.ID === p.ID ? 'selected' : ''}>
              <td>{p.name}</td><td>{p.category}</td><td>{p.price}</td><td>{p.stock}</td><td>{p.supplier?.name}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {selected && (
        <section className="detail">
          <h3>{selected.name}</h3>
          <p>Category: {selected.category}</p>
          <p>Price: {selected.price}</p>
          <p>Stock: {selected.stock}</p>
          <p>Supplier: {selected.supplier?.name} ({selected.supplier?.city}, {selected.supplier?.country})</p>
        </section>
      )}
    </>
  );
}

function Suppliers() {
  const [rows, setRows] = useState([]);
  useEffect(() => { listSuppliers().then(setRows); }, []);
  return (
    <table>
      <thead><tr><th>Name</th><th>City</th><th>Country</th></tr></thead>
      <tbody>
        {rows.map((s) => (
          <tr key={s.ID}><td>{s.name}</td><td>{s.city}</td><td>{s.country}</td></tr>
        ))}
      </tbody>
    </table>
  );
}

export default function App() {
  const [tab, setTab] = useState('products');
  return (
    <main>
      <h1>Supply Chain (React)</h1>
      <nav>
        <button className={tab === 'products' ? 'active' : ''} onClick={() => setTab('products')}>Products</button>
        <button className={tab === 'suppliers' ? 'active' : ''} onClick={() => setTab('suppliers')}>Suppliers</button>
      </nav>
      {tab === 'products' ? <Products /> : <Suppliers />}
    </main>
  );
}
