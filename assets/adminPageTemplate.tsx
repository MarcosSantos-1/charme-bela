import React, { useState } from 'react';

// --- Ícones (SVGs inline para simplicidade no exemplo) ---
// Em um projeto real, use uma biblioteca como lucide-react
const HomeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
const CalendarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>;
const UsersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const ClipboardListIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>;
const LotusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-8 h-8 text-pink-500"><path strokeLinecap="round" strokeLinejoin="round" d="M21.129 9.322c.199.39.298.815.298 1.254 0 2.13-1.64 3.866-3.693 3.866-1.396 0-2.61-1.12-3.39-2.738-.78-1.618-1.99-2.738-3.39-2.738s-2.61 1.12-3.39 2.738c-.78 1.618-2.004 2.738-3.39 2.738C2.51 14.442.87 12.706.87 10.576c0-.439.1-.864.298-1.254l.118-.236c.254-.512.63-1.004 1.13-1.478.5-.474 1.066-.928 1.69-1.362C5.33 6.02 6.94 5.5 8.73 5.5c1.79 0 3.4 1.12 4.18 2.738.78 1.618 1.99 2.738 3.39 2.738 1.4 0 2.61-1.12 3.39-2.738.78-1.618 2.39-2.738 4.18-2.738 1.79 0 3.4.52 4.66 1.482.624.434 1.19.888 1.69 1.362.5.474.876.966 1.13 1.478l.118.236z" /></svg>;

// --- DADOS MOCK (Simulando um banco de dados) ---
const dailyAppointments = [
  { time: '09:00', client: 'Ana Silva', service: 'Limpeza de Pele', status: 'Confirmado' },
  { time: '10:30', client: 'Beatriz Costa', service: 'Massagem Modeladora', status: 'Confirmado' },
  { time: '12:00', client: 'Carla Mendes', service: 'Drenagem Linfática', status: 'Aguardando' },
  { time: '14:00', client: 'Daniela Souza', service: 'Criolipólise (Sessão 2)', status: 'Confirmado' },
  { time: '16:00', client: 'Fernanda Lima', service: 'Peeling de Diamante', status: 'Pendente' },
];

const allClients = [
    { name: 'Ana Silva', phone: '(11) 98765-4321', lastVisit: '2024-07-15' },
    { name: 'Beatriz Costa', phone: '(21) 91234-5678', lastVisit: '2024-08-01' },
    { name: 'Carla Mendes', phone: '(31) 95555-8888', lastVisit: '2024-06-20' },
];

const allServices = [
    { name: 'Limpeza de Pele', price: '180,00', category: 'Facial' },
    { name: 'Massagem Modeladora', price: '250,00', category: 'Corporal' },
    { name: 'Depilação a Laser (Virilha)', price: '350,00', category: 'Bem-Estar' },
];


// --- COMPONENTES DE VISUALIZAÇÃO ---

const Dashboard = ({ setView }) => {
    const nextAppointment = dailyAppointments.find(a => new Date(`1970-01-01T${a.time}:00`) > new Date());
    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800" style={{ fontFamily: "'Playfair Display', serif" }}>Olá, [Nome da Mãe]! 👋</h1>
                    <p className="text-gray-500 mt-1">Aqui está um resumo claro e rápido do seu dia.</p>
                </div>
                <div className="flex space-x-3">
                    <button className="bg-pink-500 text-white font-semibold py-2 px-4 rounded-lg flex items-center space-x-2 hover:bg-pink-600 transition-colors">
                        <PlusIcon />
                        <span>Novo Agendamento</span>
                    </button>
                     <button className="bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg flex items-center space-x-2 hover:bg-gray-300 transition-colors">
                        <PlusIcon />
                        <span>Adicionar Cliente</span>
                    </button>
                </div>
            </div>

            {/* Cards de Resumo Rápido */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-gray-500 font-semibold">Clientes Hoje</h3>
                    <p className="text-4xl font-bold text-gray-800 mt-2">{dailyAppointments.length}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-gray-500 font-semibold">Próximo Cliente</h3>
                    <p className="text-2xl font-bold text-pink-500 mt-2">{nextAppointment?.client || 'Nenhum'}</p>
                    <p className="text-gray-500">{nextAppointment ? `às ${nextAppointment.time}` : 'Dia finalizado!'}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-gray-500 font-semibold">Faturamento Previsto</h3>
                    <p className="text-4xl font-bold text-gray-800 mt-2">R$ 1.250</p>
                </div>
            </div>

            {/* Tabela de Agendamentos do Dia */}
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold text-gray-700 mb-4">Agenda do Dia</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b bg-gray-50">
                                <th className="p-3">Horário</th>
                                <th className="p-3">Cliente</th>
                                <th className="p-3">Serviço</th>
                                <th className="p-3">Status</th>
                                <th className="p-3">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dailyAppointments.map((apt, index) => (
                                <tr key={index} className="border-b hover:bg-gray-50">
                                    <td className="p-3 font-semibold">{apt.time}</td>
                                    <td className="p-3">{apt.client}</td>
                                    <td className="p-3 text-gray-600">{apt.service}</td>
                                    <td className="p-3">
                                        <span className={`px-3 py-1 text-sm rounded-full font-semibold ${
                                            apt.status === 'Confirmado' ? 'bg-green-100 text-green-700' :
                                            apt.status === 'Aguardando' ? 'bg-blue-100 text-blue-700' :
                                            'bg-yellow-100 text-yellow-700'
                                        }`}>
                                            {apt.status}
                                        </span>
                                    </td>
                                    <td className="p-3">
                                        <button className="text-pink-500 hover:underline font-semibold">Ver Detalhes</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const AgendaView = () => (
    <div>
        <h1 className="text-3xl font-bold text-gray-800 mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>Agenda Completa</h1>
        <div className="bg-white p-8 rounded-lg shadow-md text-center text-gray-500">
            <p>Aqui ficaria um componente de calendário interativo.</p>
            <p>(Visualização por Dia, Semana e Mês)</p>
        </div>
    </div>
);

const ClientsView = () => (
     <div>
        <h1 className="text-3xl font-bold text-gray-800 mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>Gerenciar Clientes</h1>
        <div className="bg-white p-6 rounded-lg shadow-md">
            <input type="text" placeholder="🔎 Pesquisar cliente por nome ou telefone..." className="w-full p-3 border rounded-lg mb-4"/>
             <table className="w-full text-left">
                <thead>
                    <tr className="border-b bg-gray-50">
                        <th className="p-3">Nome</th>
                        <th className="p-3">Telefone</th>
                        <th className="p-3">Última Visita</th>
                        <th className="p-3">Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {allClients.map((client, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                            <td className="p-3 font-semibold">{client.name}</td>
                            <td className="p-3">{client.phone}</td>
                            <td className="p-3 text-gray-600">{client.lastVisit}</td>
                            <td className="p-3">
                                <button className="text-pink-500 hover:underline font-semibold">Ver Perfil</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

const ServicesView = () => (
     <div>
        <h1 className="text-3xl font-bold text-gray-800 mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>Serviços e Planos</h1>
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold text-gray-700 mb-4">Gerenciar Procedimentos</h2>
             <table className="w-full text-left">
                <thead>
                    <tr className="border-b bg-gray-50">
                        <th className="p-3">Nome do Serviço</th>
                        <th className="p-3">Preço (R$)</th>
                        <th className="p-3">Categoria</th>
                        <th className="p-3">Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {allServices.map((service, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                            <td className="p-3 font-semibold">{service.name}</td>
                            <td className="p-3">{service.price}</td>
                            <td className="p-3 text-gray-600">{service.category}</td>
                            <td className="p-3">
                                <button className="text-pink-500 hover:underline font-semibold">Editar</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <p className="mt-8 text-center text-gray-500">Aqui também ficaria a gestão de planos/pacotes.</p>
        </div>
    </div>
);


// --- COMPONENTE PRINCIPAL (App) ---

export default function App() {
    const [activeView, setActiveView] = useState('dashboard');

    const renderView = () => {
        switch (activeView) {
            case 'dashboard':
                return <Dashboard setView={setActiveView} />;
            case 'agenda':
                return <AgendaView />;
            case 'clients':
                return <ClientsView />;
            case 'services':
                return <ServicesView />;
            default:
                return <Dashboard setView={setActiveView} />;
        }
    };

    const NavLink = ({ view, icon, children }) => (
        <button 
            onClick={() => setActiveView(view)}
            className={`flex items-center space-x-3 w-full text-left px-4 py-3 rounded-lg transition-colors ${
                activeView === view 
                ? 'bg-pink-100 text-pink-600 font-bold' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
        >
            {icon}
            <span>{children}</span>
        </button>
    );

    return (
        <div className="flex h-screen bg-gray-100 font-sans">
            {/* Sidebar (Navegação) */}
            <aside className="w-64 bg-white p-6 flex flex-col shadow-lg">
                <div className="flex items-center space-x-2 mb-10">
                    <LotusIcon />
                    <span style={{ fontFamily: "'Playfair Display', serif" }} className="text-2xl font-bold text-gray-800">Charme & Bela</span>
                </div>
                <nav className="flex flex-col space-y-2">
                    <NavLink view="dashboard" icon={<HomeIcon />}>Início</NavLink>
                    <NavLink view="agenda" icon={<CalendarIcon />}>Agenda</NavLink>
                    <NavLink view="clients" icon={<UsersIcon />}>Clientes</NavLink>
                    <NavLink view="services" icon={<ClipboardListIcon />}>Serviços e Planos</NavLink>
                </nav>
                <div className="mt-auto text-center text-xs text-gray-400">
                    <p>Sistema de Gestão v1.0</p>
                    <p>Desenvolvido com ❤️</p>
                </div>
            </aside>

            {/* Conteúdo Principal */}
            <main className="flex-1 p-8 overflow-y-auto">
                {renderView()}
            </main>
        </div>
    );
}
