import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { AlertTriangle, CheckCircle, Clock, MapPin, Activity } from 'lucide-react';

const AlertContainer = styled.div`
  background: rgba(255, 255, 255, 0.95);
  border-radius: 15px;
  padding: 25px;
  margin-bottom: 20px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
`;

const AlertHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 2px solid #ecf0f1;
`;

const AlertTitle = styled.h2`
  color: #2c3e50;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const AlertStats = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
  margin-bottom: 25px;
`;

const StatCard = styled.div`
  background: ${props => props.bgColor || '#3498db'};
  color: white;
  padding: 15px;
  border-radius: 10px;
  text-align: center;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
`;

const StatNumber = styled.div`
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 5px;
`;

const StatLabel = styled.div`
  font-size: 12px;
  opacity: 0.9;
`;

const RefreshButton = styled.button`
  background: #3498db;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  transition: background 0.3s ease;

  &:hover {
    background: #2980b9;
  }
`;

const AlertListContainer = styled.div`
  max-height: 280px;
  overflow-y: auto;
  padding-right: 10px;
  
  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
  }
`;

const AlertList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

const AlertItem = styled.div`
  background: ${props => 
    props.severity === 'critical' ? '#fdf2f2' : 
    props.severity === 'warning' ? '#fef9e7' : '#f8f9fa'
  };
  border-left: 4px solid ${props => 
    props.severity === 'critical' ? '#e74c3c' : 
    props.severity === 'warning' ? '#f39c12' : '#95a5a6'
  };
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

const AlertHeaderItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
`;

const AlertSensor = styled.div`
  font-weight: bold;
  font-size: 16px;
  color: #2c3e50;
`;

const AlertSeverity = styled.span`
  background: ${props => 
    props.severity === 'critical' ? '#e74c3c' : 
    props.severity === 'warning' ? '#f39c12' : '#95a5a6'
  };
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
  text-transform: uppercase;
`;

const AlertDetails = styled.div`
  color: #34495e;
  margin-bottom: 8px;
  font-size: 14px;
`;

const AlertLocation = styled.div`
  color: #7f8c8d;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 4px;
`;

const AlertTime = styled.div`
  color: #7f8c8d;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
`;

const NoAlerts = styled.div`
  text-align: center;
  padding: 40px;
  color: #7f8c8d;
`;

const AlertDashboard = () => {
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const [alertsResponse, statsResponse] = await Promise.all([
        fetch('/api/alerts/active'),
        fetch('/api/alerts/stats')
      ]);
      
      const alertsData = await alertsResponse.json();
      const statsData = await statsResponse.json();
      
      setAlerts(alertsData.alerts || []);
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getSeverityIcon = (severity) => {
    if (severity === 'critical') return '🔴';
    if (severity === 'warning') return '🟡';
    return '⚪';
  };

  useEffect(() => {
    fetchAlerts();
    // Refresh every 30 seconds
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <AlertContainer>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          Loading alerts...
        </div>
      </AlertContainer>
    );
  }

  return (
    <AlertContainer>
      <AlertHeader>
        <AlertTitle>
          <AlertTriangle color="#e74c3c" size={24} />
          Alert Dashboard
        </AlertTitle>
        <RefreshButton onClick={fetchAlerts}>
          <Activity size={16} />
          Refresh
        </RefreshButton>
      </AlertHeader>

      <AlertStats>
        <StatCard bgColor="#e74c3c">
          <StatNumber>{stats.active_alerts || 0}</StatNumber>
          <StatLabel>Active Alerts</StatLabel>
        </StatCard>
        <StatCard bgColor="#f39c12">
          <StatNumber>{stats.warning_count || 0}</StatNumber>
          <StatLabel>Warnings</StatLabel>
        </StatCard>
        <StatCard bgColor="#e74c3c">
          <StatNumber>{stats.critical_count || 0}</StatNumber>
          <StatLabel>Critical</StatLabel>
        </StatCard>
      </AlertStats>

      <AlertListContainer>
        <AlertList>
          {alerts.length === 0 ? (
            <NoAlerts>
              <CheckCircle size={48} color="#27ae60" />
              <div style={{ marginTop: '10px' }}>No active alerts</div>
              <div style={{ fontSize: '12px', marginTop: '5px' }}>
                All systems operating normally
              </div>
            </NoAlerts>
          ) : (
            alerts.map((alert) => (
              <AlertItem key={alert.alert_id} severity={alert.severity}>
                <AlertHeaderItem>
                  <AlertSensor>
                    {getSeverityIcon(alert.severity)}
                    {alert.sensor_id}
                  </AlertSensor>
                  <AlertSeverity severity={alert.severity}>
                    {alert.severity}
                  </AlertSeverity>
                </AlertHeaderItem>
                
                <AlertDetails>
                  <strong>{alert.metric}:</strong> {alert.value} | 
                  <strong> Type:</strong> {alert.sensor_type}
                </AlertDetails>
                
                <AlertLocation>
                  <MapPin size={14} />
                  {alert.location?.road || 'Unknown location'}, Prishtina
                </AlertLocation>
                
                <AlertTime>
                  <Clock size={12} />
                  {formatTime(alert.timestamp)}
                </AlertTime>
              </AlertItem>
            ))
          )}
        </AlertList>
      </AlertListContainer>
    </AlertContainer>
  );
};

export default AlertDashboard;
