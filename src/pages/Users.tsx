import React, { useState } from 'react';
import { db, hashPassword } from '../store';
import { useAuth } from '../contexts/AuthContext';
import { PageHeader, Button, Modal, Input, Select, SearchInput, EmptyState, Card, showToast, ConfirmDialog, Badge } from '../components/ui';
import { Plus, Users, Edit2, Trash2, Shield } from 'lucide-react';
import { User, UserRole } from '../types';

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState(db.getUsers());
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'employee' as UserRole });

  const isAdmin = currentUser?.role === 'admin';

  const filtered = users.filter(u => !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));

  const openCreate = () => { setEditing(null); setForm({ name: '', email: '', password: '', role: 'employee' }); setModalOpen(true); };
  const openEdit = (u: User) => { setEditing(u); setForm({ name: u.name, email: u.email, password: '', role: u.role }); setModalOpen(true); };

  const handleSave = () => {
    if (!form.name || !form.email) { showToast('error', 'Nome e e-mail são obrigatórios'); return; }
    if (!editing && !form.password) { showToast('error', 'Senha é obrigatória'); return; }
    if (!editing && form.password.length < 6) { showToast('error', 'Senha deve ter pelo menos 6 caracteres'); return; }

    if (editing) {
      const update: Partial<User> = { name: form.name, email: form.email, role: form.role };
      if (form.password) update.passwordHash = hashPassword(form.password);
      db.updateUser(editing.id, update);
      showToast('success', 'Usuário atualizado');
    } else {
      const existing = db.getUserByEmail(form.email);
      if (existing) { showToast('error', 'E-mail já cadastrado'); return; }
      db.createUser({ name: form.name, email: form.email, passwordHash: hashPassword(form.password), role: form.role });
      showToast('success', 'Usuário criado');
    }
    setUsers(db.getUsers());
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (id === currentUser?.id) { showToast('error', 'Não é possível excluir seu próprio usuário'); return; }
    db.deleteUser(id);
    setUsers(db.getUsers());
    showToast('success', 'Usuário excluído');
  };

  const roleLabels: Record<string, string> = { admin: 'Administrador', manager: 'Gestor', technician: 'Técnico', employee: 'Funcionário', student: 'Aluno' };
  const roleColors: Record<string, string> = { admin: 'red', manager: 'purple', technician: 'blue', employee: 'green', student: 'gray' };

  if (!isAdmin) {
    return (
      <div>
        <PageHeader title="Usuários" subtitle="Gerenciamento de usuários" />
        <EmptyState icon={<Shield size={48} />} title="Acesso restrito" description="Apenas administradores podem gerenciar usuários." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Usuários" subtitle="Gerenciamento de usuários do sistema" actions={<Button onClick={openCreate}><Plus size={16} className="inline mr-1" /> Novo Usuário</Button>} />

      <div className="mb-4"><SearchInput value={search} onChange={setSearch} placeholder="Pesquisar usuários..." /></div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Users size={48} />} title="Nenhum usuário" description="Cadastre o primeiro usuário do sistema." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(u => (
            <Card key={u.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold">{u.name.charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-800 truncate">{u.name}</h3>
                  <p className="text-xs text-gray-500 truncate">{u.email}</p>
                  <Badge color={roleColors[u.role]}>{roleLabels[u.role]}</Badge>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(u)} className="p-1.5 rounded hover:bg-gray-100"><Edit2 size={14} className="text-gray-500" /></button>
                  {u.id !== currentUser?.id && <button onClick={() => setDeleteConfirm(u.id)} className="p-1.5 rounded hover:bg-gray-100"><Trash2 size={14} className="text-red-500" /></button>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Usuário' : 'Novo Usuário'}>
        <div className="space-y-4">
          <Input label="Nome *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <Input label="E-mail *" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          <Input label={editing ? 'Nova Senha (deixe vazio para manter)' : 'Senha *'} type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
          <Select label="Tipo de Usuário" value={form.role} onChange={e => setForm({ ...form, role: e.target.value as UserRole })}>
            <option value="admin">Administrador</option>
            <option value="manager">Gestor</option>
            <option value="technician">Técnico</option>
            <option value="employee">Funcionário</option>
            <option value="student">Aluno</option>
          </Select>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar</Button>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)} title="Excluir Usuário" message="Tem certeza que deseja excluir este usuário?" />
    </div>
  );
}
