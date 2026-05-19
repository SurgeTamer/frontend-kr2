import { Routes, Route, Navigate, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Products from "./pages/Products.jsx";
import ProductDetail from "./pages/ProductDetail.jsx";
import ProductForm from "./pages/ProductForm.jsx";
import Users from "./pages/Users.jsx";
import { api } from "./api/client.js";
import { ROLES, roleLabel } from "./roles.js";

function PrivateRoute({ children }) {
  const token = localStorage.getItem("accessToken");
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function Layout({ children, user, onLogout }) {
  const canManageProducts = user && [ROLES.SELLER, ROLES.ADMIN].includes(user.role);
  const isAdmin = user && user.role === ROLES.ADMIN;

  return (
    <div className="container">
      <header>
        <span>
          <h1>Магазин парфюмерии</h1>
          {user && (
            <p>
              {user.first_name} {user.last_name} ({roleLabel(user.role)})
            </p>
          )}
        </span>
        <nav className="nav-links">
          {user && <Link to="/products">Каталог</Link>}
          {canManageProducts && <Link to="/products/new">Добавить аромат</Link>}
          {isAdmin && <Link to="/users">Пользователи</Link>}
          {user ? (
            <button type="button" onClick={onLogout}>
              Выйти
            </button>
          ) : (
            <>
              <Link to="/login">Вход</Link>
              <Link to="/register">Регистрация</Link>
            </>
          )}
        </nav>
      </header>
      {children}
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    api
      .me()
      .then((res) => setUser(res.data))
      .catch(() => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
      });
  }, []);

  const handleLogin = (tokens, profile) => {
    localStorage.setItem("accessToken", tokens.accessToken);
    localStorage.setItem("refreshToken", tokens.refreshToken);
    setUser(profile);
    navigate("/products");
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setUser(null);
    navigate("/login");
  };

  return (
    <Layout user={user} onLogout={handleLogout}>
      <Routes>
        <Route path="/" element={<Navigate to="/products" replace />} />
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/products"
          element={
            <PrivateRoute>
              <Products user={user} />
            </PrivateRoute>
          }
        />
        <Route
          path="/products/new"
          element={
            <PrivateRoute>
              <ProductForm user={user} />
            </PrivateRoute>
          }
        />
        <Route
          path="/products/:id"
          element={
            <PrivateRoute>
              <ProductDetail user={user} />
            </PrivateRoute>
          }
        />
        <Route
          path="/products/:id/edit"
          element={
            <PrivateRoute>
              <ProductForm user={user} edit />
            </PrivateRoute>
          }
        />
        <Route
          path="/users"
          element={
            <PrivateRoute>
              <Users user={user} />
            </PrivateRoute>
          }
        />
      </Routes>
    </Layout>
  );
}
