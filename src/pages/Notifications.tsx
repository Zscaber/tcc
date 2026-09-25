import React, { useState } from 'react';
import { db } from '../store';
import { useAuth } from '../contexts/AuthContext';
import { PageHeader, Button, Card, EmptyState, Badge } from '../components/ui';
import { Bell, Check, CheckCheck, AlertTriangle, Info, AlertCircle, CheckCircle } from 'lucide-react';

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState(db.getNotifications(user?.id));

  const markRead = (id: string) => {
    db.markNotificationRead(id);
    setNotifications(db.getNotifications(user?.id));
  };

  const markAllRead = () => {
    db.markAllNotificationsRead(user!.id);
    setNotifications(db.getNotifications(user?.id));
  };

  const unread = notifications.filter(n => !n.read);
  const read = notifications.filter(n => n.read);

  const icons = { warning: AlertTriangle, info: Info, error: AlertCircle, success: CheckCircle };
  const colors = { warning: 'text-yellow-500 bg-yellow-50', info: 'text-blue-500 bg-blue-50', error: 'text-red-500 bg-red-50', success: 'text-green-500 bg-green-50' };

  return (
    <div>
      <PageHeader title="Notificações" subtitle={`${unread.length} não lida(s)`} actions={unread.length > 0 ? <Button variant="secondary" onClick={markAllRead}><CheckCheck size={16} className="inline mr-1" /> Marcar todas como lidas</Button> : undefined} />

      {notifications.length === 0 ? (
        <EmptyState icon={<Bell size={48} />} title="Nenhuma notificação" description="Você não possui notificações no momento." />
      ) : (
        <div className="space-y-4">
          {unread.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-600 mb-2">Não lidas</h3>
              <div className="space-y-2">
                {unread.map(n => {
                  const Icon = icons[n.type] || Info;
                  return (
                    <Card key={n.id} className="p-4 border-l-4 border-l-blue-500">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${colors[n.type]}`}><Icon size={18} /></div>
                          <div>
                            <h4 className="font-medium text-gray-800">{n.title}</h4>
                            <p className="text-sm text-gray-600">{n.message}</p>
                            <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString('pt-BR')}</p>
                          </div>
                        </div>
                        <button onClick={() => markRead(n.id)} className="p-1.5 rounded hover:bg-gray-100" title="Marcar como lida"><Check size={16} className="text-green-600" /></button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
          {read.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-600 mb-2">Lidas</h3>
              <div className="space-y-2">
                {read.map(n => {
                  const Icon = icons[n.type] || Info;
                  return (
                    <Card key={n.id} className="p-4 opacity-70">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${colors[n.type]}`}><Icon size={18} /></div>
                        <div>
                          <h4 className="font-medium text-gray-800">{n.title}</h4>
                          <p className="text-sm text-gray-600">{n.message}</p>
                          <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString('pt-BR')}</p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
