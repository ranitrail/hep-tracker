import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { auth } from './services/auth';
import Layout from './components/Layout';
import Login from './pages/Login';
import ClientDashboard from './pages/ClientDashboard';
import ClientProgress from './pages/ClientProgress';
import PhysiotherapistDashboard from './pages/PhysiotherapistDashboard';
import ClientManagement from './pages/ClientManagement';
import ExerciseLibrary from './pages/ExerciseLibrary';

function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    auth.getCurrentUser()
      .then(u => setUser(u))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login onLogin={() => window.location.href = '/'} />} />
        <Route
          path="/*"
          element={
            user ? (
              <Layout user={user}>
                <Routes>
                  {user.user_type === 'client' ? (
                    <>  
                      <Route path="my-exercises" element={<ClientDashboard />} />
                      <Route path="progress" element={<ClientProgress />} />
                      <Route path="*" element={<Navigate to="my-exercises" replace />} />
                    </>
                  ) : (
                    <>  
                      <Route path="dashboard" element={<PhysiotherapistDashboard />} />
                      <Route path="clients" element={<ClientManagement />} />
                      <Route path="exercises" element={<ExerciseLibrary />} />
                      <Route path="*" element={<Navigate to="dashboard" replace />} />
                    </>
                  )}
                </Routes>
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </Router>
  );
}

export default App;