import React, { useState } from 'react';
import { db } from '../store';
import { useAuth } from '../contexts/AuthContext';
import { PageHeader, Button, Modal, Input, SearchInput, EmptyState, Card, showToast, ConfirmDialog } from '../components/ui';
import { Plus, Users, Edit2, Trash2, User } from 'lucide-react';
import { Person } from '../types';

export default function People() {
  const { user } = useAuth();
  const [people, setPeople] = useState(db.getPeople());
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Person | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', position: '', email: '' });

  const filtered = people.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.email.toLowerCase().includes(search.toLowerCase()) || p.position.toLowerCase().includes(search.toLowerCase()));

  const openCreate = () => { setEditing(null); setForm({ name: '', position: '', email: '' }); setModalOpen(true); };
  const openEdit = (p: Person) => { setEditing(p); setForm({ name: p.name, position: p.position, email: p.email }); setModalOpen(true); };

  const handleSave = () => {
    if (!form.name) { showToast('error', 'Nome é obrigatório'); return; }
    if (editing) {
      db.updatePerson(editing.id, form);
      db.addHistory({ userId: user!.id, action: 'Pessoa atualizada', entity: 'person', entityId: editing.id, details: form.name });
      showToast('success', 'Pessoa atualizada');
    } else {
      db.createPerson(form);
      db.addHistory({ userId: user!.id, action: 'Pessoa cadastrada', entity: 'person', entityId: 'new', details: form.name });
      showToast('success', 'Pessoa cadastrada');
    }
    setPeople(db.getPeople());
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    const p = db.getPersonById(id);
    db.deletePerson(id);
    db.addHistory({ userId: user!.id, action: 'Pessoa excluída', entity: 'person', entityId: id, details: p?.name || '' });
    setPeople(db.getPeople());
    showToast('success', 'Pessoa excluída');
  };

  return (
    <div>
      <PageHeader title="Pessoas" subtitle="Cadastro de pessoas" actions={<Button onClick={openCreate}><Plus size={16} className="inline mr-1" /> Nova Pessoa</Button>} />

      <div className="mb-4"><SearchInput value={search} onChange={setSearch} placeholder="Pesquisar pessoas..." /></div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Users size={48} />} title="Nenhuma pessoa cadastrada" description="Cadastre a primeira pessoa para começar." action={<Button onClick={openCreate}>Cadastrar Pessoa</Button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(p => (
            <Card key={p.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold">{p.name.charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-800 truncate">{p.name}</h3>
                  <p className="text-sm text-gray-500">{p.position || '—'}</p>
                  <p className="text-xs text-gray-400 truncate">{p.email}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(p)} className="p-1.5 rounded hover:bg-gray-100"><Edit2 size={14} className="text-gray-500" /></button>
                  <button onClick={() => setDeleteConfirm(p.id)} className="p-1.5 rounded hover:bg-gray-100"><Trash2 size={14} className="text-red-500" /></button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Pessoa' : 'Nova Pessoa'}>
        <div className="space-y-4">
          <Input label="Nome *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <Input label="Cargo" value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} />
          <Input label="E-mail" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar</Button>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)} title="Excluir Pessoa" message="Tem certeza que deseja excluir esta pessoa?" />
    </div>
  );
}
