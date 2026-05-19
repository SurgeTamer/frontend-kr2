import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client.js";
import { ROLES } from "../roles.js";

export default function ProductDetail({ user }) {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState("");
  const canEdit = user && [ROLES.SELLER, ROLES.ADMIN].includes(user.role);
  const canDelete = user?.role === ROLES.ADMIN;

  useEffect(() => {
    api
      .getProduct(id)
      .then((res) => setProduct(res.data))
      .catch((err) => setError(err.response?.data?.error || "Товар не найден"));
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm("Удалить аромат?")) return;
    try {
      await api.deleteProduct(id);
      window.location.href = "/products";
    } catch (err) {
      alert(err.response?.data?.error || "Ошибка удаления");
    }
  };

  if (error) return <p className="error">{error}</p>;
  if (!product) return <p>Загрузка...</p>;

  return (
    <section className="card">
      <img
        className="product-image"
        src={product.image || "/placeholder-perfume.svg"}
        alt={product.title}
      />
      <h2>{product.title}</h2>
      <p>
        <strong>Категория:</strong> {product.category}
      </p>
      <p>
        <strong>Объём:</strong> {product.volume || "—"}
      </p>
      <p>
        <strong>Цена:</strong> {product.price} ₽
      </p>
      <p>
        <strong>Описание:</strong> {product.description}
      </p>
      {canEdit && <Link to={`/products/${id}/edit`}>Редактировать</Link>}
      {canDelete && (
        <button type="button" className="danger" onClick={handleDelete}>
          Удалить
        </button>
      )}
      <p>
        <Link to="/products">← Назад к каталогу</Link>
      </p>
    </section>
  );
}
