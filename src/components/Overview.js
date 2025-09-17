import React from 'react';
import styled from 'styled-components';
import { RefreshCw } from 'lucide-react';
import SensorGrid from './SensorGrid';
import SensorMap from './SensorMap';
import FilterButtons from './FilterButtons';
import TrafficMonitoring from './TrafficMonitoring';

const TabContent = styled.div`
  background: rgba(255, 255, 255, 0.95);
  border-radius: 0 0 15px 15px;
  padding: 30px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
  min-height: 600px;
`;

const OverviewContent = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
  margin-bottom: 30px;

  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
`;

const LastUpdated = styled.div`
  text-align: center;
  color: #7f8c8d;
  font-style: italic;
  margin: 20px 0;
`;

const RefreshButton = styled.button`
  background: #3498db;
  color: white;
  padding: 12px 25px;
  border: none;
  border-radius: 25px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.3s ease;
  margin: 20px auto;
  display: flex;
  align-items: center;
  gap: 8px;

  &:hover {
    background: #2980b9;
    transform: translateY(-2px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const LoadingMessage = styled.div`
  text-align: center;
  color: #7f8c8d;
  font-size: 1.2em;
  padding: 40px;
`;

const ErrorMessage = styled.div`
  color: #e74c3c;
  text-align: center;
  padding: 20px;
  background: #fdf2f2;
  border-radius: 10px;
  margin: 20px 0;
`;

const Overview = ({
  sensors,
  allSensors,
  selectedSensor,
  sensorFilter,
  onSensorSelect,
  onFilterChange,
  onClearSelection,
  lastUpdated,
  onRefresh,
  loading,
  error
}) => {
  const formatLastUpdated = (time) => {
    if (!time) return 'Loading...';
    const date = new Date(time);
    return `Last Updated: ${date.toLocaleTimeString()}`;
  };

  if (error) {
    return (
      <TabContent>
        <ErrorMessage>Error loading data: {error}</ErrorMessage>
        <div style={{ textAlign: 'center' }}>
          <RefreshButton onClick={onRefresh}>
            <RefreshCw size={16} />
            Retry
          </RefreshButton>
        </div>
      </TabContent>
    );
  }

  return (
    <TabContent>
      <OverviewContent>
        <div>
          <FilterButtons
            sensorFilter={sensorFilter}
            selectedSensor={selectedSensor}
            onFilterChange={onFilterChange}
            onClearSelection={onClearSelection}
          />
          
          {loading ? (
            <LoadingMessage>Loading sensor data...</LoadingMessage>
          ) : (
            <SensorGrid
              sensors={sensors}
              selectedSensor={selectedSensor}
              onSensorSelect={onSensorSelect}
            />
          )}
        </div>

        <SensorMap
          sensors={sensors}
          selectedSensor={selectedSensor}
          onSensorSelect={onSensorSelect}
        />
      </OverviewContent>

      <TrafficMonitoring 
        sensors={sensors}
        loading={loading}
        error={error}
        onSensorSelect={onSensorSelect}
      />

      <LastUpdated>
        {formatLastUpdated(lastUpdated)}
      </LastUpdated>

      <div style={{ textAlign: 'center' }}>
        <RefreshButton onClick={onRefresh} disabled={loading}>
          <RefreshCw size={16} />
          Refresh Data
        </RefreshButton>
      </div>
    </TabContent>
  );
};

export default Overview; 