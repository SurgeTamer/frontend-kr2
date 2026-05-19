import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client.js";
import { ROLES } from "../roles.js";

export default function ProductForm({ user, edit }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "",
    category: "женские",
    description: "",
    volume: "",
    price: "",
    image: "",
  });
  const [error, setError] = useState("");

  const canManage = user && [ROLES.SELLER, ROLES.ADMIN].includes(user.role);
  if (!canManage) {
    return <p className="error">Недостаточно прав для управления товарами</p>;
  }

  useEffect(() => {
    if (!edit || !id) return;
    api
      .getProduct(id)
      .then((res) =>
        setForm({
          title: res.data.title || "",
          category: res.data.category || "женские",
          description: res.data.description || "",
          volume: res.data.volume || "",
          price: res.data.price ?? "",
          image: res.data.image || "",
        })
      )
      .catch((err) => setError(err.response?.data?.error || "Товар не найден"));
  }, [edit, id]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const payload = { ...form, price: Number(form.price) };
    try {
      if (edit) {
        await api.updateProduct(id, payload);
        navigate(`/products/${id}`);
      } else {
        const res = await api.createProduct(payload);
        navigate(`/products/${res.data.id}`);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Ошибка сохранения");
    }
  };

  return (
    <section className="card">
      <h2>{edit ? "Редактирование аромата" : "Новый аромат"}</h2>
      <form onSubmit={handleSubmit}>
        <input name="title" placeholder="Название" value={form.title} onChange={handleChange} required />
        <select name="category" value={form.category} onChange={handleChange}>
          <option value="женские">Женские</option>
          <option value="мужские">Мужские</option>
          <option value="унисекс">Унисекс</option>
        </select>
        <textarea
          name="description"
          placeholder="Описание"
          value={form.description}
          onChange={handleChange}
          required
        />
        <input
          name="volume"
          placeholder="Объём"
          value={form.volume}
          onChange={handleChange}
          required
        />
        <input name="price" type="number" placeholder="Цена" value={form.price} onChange={handleChange} required />
        <input
          name="image"
          placeholder="Путь к изображению, например /images/chanel.jpg"
          value={form.image}
          onChange={handleChange}
        />
        {error && <p className="error">{error}</p>}
        <button type="submit">Сохранить</button>
      </form>
    </section>
  );
}
