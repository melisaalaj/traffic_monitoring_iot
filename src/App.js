import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import Header from './components/Header';
import StatisticsSection from './components/StatisticsSection';
import TabNavigation from './components/TabNavigation';
import Overview from './components/Overview';
import DataTables from './components/DataTables';
import TrafficMonitoring from './components/TrafficMonitoring';
import Visuals from './components/Visuals';

const Container = styled.div`
  max-width: 1800px;
  margin: 0 auto;
`;

const App = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [sensors, setSensors] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSensor, setSelectedSensor] = useState(null);
  const [sensorFilter, setSensorFilter] = useState('all');

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get('/api/data');
      setSensors(response.data.sensors);
      setStatistics(response.data.statistics);
      setLastUpdated(response.data.last_updated);
    } catch (err) {
      setError(err.message);
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSensorSelect = (sensorId) => {
    setSelectedSensor(sensorId);
    setSensorFilter('all'); // Clear filter when selecting individual sensor
  };

  const handleFilterChange = (filter) => {
    setSensorFilter(filter);
    setSelectedSensor(null); // Clear individual selection when filtering
  };

  const clearSelection = () => {
    setSelectedSensor(null);
  };

  const getFilteredSensors = () => {
    if (selectedSensor) {
      return sensors.filter(sensor => sensor.sensor_id === selectedSensor);
    }
    
    if (sensorFilter === 'all') {
      return sensors;
    }
    
    return sensors.filter(sensor => sensor.sensor_type === sensorFilter);
  };

  return (
    <Container>
      <Header />
      
      {statistics && (
        <StatisticsSection statistics={statistics} />
      )}
      
      <TabNavigation 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
      />
      
      {activeTab === 'overview' && (
        <Overview
          sensors={getFilteredSensors()}
          allSensors={sensors}
          selectedSensor={selectedSensor}
          sensorFilter={sensorFilter}
          onSensorSelect={handleSensorSelect}
          onFilterChange={handleFilterChange}
          onClearSelection={clearSelection}
          lastUpdated={lastUpdated}
          onRefresh={loadData}
          loading={loading}
          error={error}
        />
      )}
      
      {activeTab === 'visualizations' && (
        <Visuals
          sensors={sensors}
          loading={loading}
          error={error}
        />
      )}
      
      {activeTab === 'tables' && (
        <DataTables />
      )}
    </Container>
  );
};

export default App; 