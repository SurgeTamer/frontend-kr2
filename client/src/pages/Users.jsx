import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import { ROLES, roleLabel } from "../roles.js";

export default function Users({ user }) {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");

  const loadUsers = () => {
    api
      .getUsers()
      .then((res) => setUsers(res.data))
      .catch((err) => setError(err.response?.data?.error || "Ошибка загрузки"));
  };

  useEffect(() => {
    if (user?.role === ROLES.ADMIN) loadUsers();
  }, [user]);

  if (user?.role !== ROLES.ADMIN) {
    return <p className="error">Раздел доступен только администратору</p>;
  }

  const handleRoleChange = async (id, role) => {
    try {
      await api.updateUser(id, { role });
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.error || "Ошибка обновления");
    }
  };

  const handleBlock = async (id) => {
    if (!window.confirm("Заблокировать пользователя?")) return;
    try {
      await api.blockUser(id);
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.error || "Ошибка блокировки");
    }
  };

  return (
    <section>
      <h2>Пользователи</h2>
      {error && <p className="error">{error}</p>}
      <table>
        <thead>
          <tr>
            <th>Email</th>
            <th>Имя</th>
            <th>Роль</th>
            <th>Статус</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.email}</td>
              <td>
                {u.first_name} {u.last_name}
              </td>
              <td>
                <select value={u.role} onChange={(e) => handleRoleChange(u.id, e.target.value)}>
                  <option value={ROLES.USER}>{roleLabel(ROLES.USER)}</option>
                  <option value={ROLES.SELLER}>{roleLabel(ROLES.SELLER)}</option>
                  <option value={ROLES.ADMIN}>{roleLabel(ROLES.ADMIN)}</option>
                </select>
              </td>
              <td>{u.blocked ? "заблокирован" : "активен"}</td>
              <td>
                {!u.blocked && (
                  <button type="button" className="danger" onClick={() => handleBlock(u.id)}>
                    Заблокировать
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
