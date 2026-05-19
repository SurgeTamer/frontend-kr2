import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import { ROLES } from "../roles.js";

export default function Products({ user }) {
  const [products, setProducts] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getProducts()
      .then((res) => setProducts(res.data))
      .catch((err) => setError(err.response?.data?.error || "Не удалось загрузить каталог"));
  }, []);

  const canDelete = user?.role === ROLES.ADMIN;

  const handleDelete = async (id) => {
    if (!window.confirm("Удалить аромат из каталога?")) return;
    try {
      await api.deleteProduct(id);
      setProducts((list) => list.filter((p) => p.id !== id));
    } catch (err) {
      alert(err.response?.data?.error || "Ошибка удаления");
    }
  };

  return (
    <section>
      <h2>Каталог парфюмерии</h2>
      {error && <p className="error">{error}</p>}
      <div className="grid">
        {products.map((product) => (
          <article key={product.id} className="card">
            <img
              className="product-image"
              src={product.image || "/placeholder-perfume.svg"}
              alt={product.title}
            />
            <h3>{product.title}</h3>
            <p>{product.category}</p>
            <p>{product.price} ₽</p>
            <Link to={`/products/${product.id}`}>Подробнее</Link>
            {canDelete && (
              <button type="button" className="danger" onClick={() => handleDelete(product.id)}>
                Удалить
              </button>
            )}
          </article>
        ))}
      </div>
      {products.length === 0 && <p>Каталог пуст. Продавец может добавить ароматы.</p>}
    </section>
  );
}
