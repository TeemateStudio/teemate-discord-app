import { Outlet, useParams } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';

export default function Layout() {
  const { guildId } = useParams();

  return (
    <div className="app-layout">
      {guildId && <Sidebar />}
      <div className="app-content">
        <Header />
        <div className="main-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
