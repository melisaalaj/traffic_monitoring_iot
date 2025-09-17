import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const VisualsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 20px;
  margin: 20px 0;
`;

const ChartCard = styled.div`
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 3px 10px rgba(0,0,0,0.1);
  border-left: 4px solid #f39c12;
`;

const ChartTitle = styled.h3`
  color: #2c3e50;
  margin: 0 0 15px 0;
  font-size: 1.2em;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ChartWrapper = styled.div`
  height: 300px;
  position: relative;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
`;

const StatBox = styled.div`
  background: #f8f9fa;
  padding: 15px;
  border-radius: 8px;
  text-align: center;
  border-left: 3px solid #f39c12;
`;

const StatValue = styled.div`
  font-size: 1.5em;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 5px;
`;

const StatLabel = styled.div`
  font-size: 0.9em;
  color: #7f8c8d;
`;

const ControlsContainer = styled.div`
  margin-bottom: 20px;
`;

const ControlGroup = styled.div`
  margin-bottom: 12px;
`;

const ControlLabel = styled.div`
  font-size: 0.9em;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 6px;
`;

const TimeSelector = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
`;

const TimeButton = styled.button`
  padding: 6px 12px;
  border: 2px solid #f39c12;
  background: ${props => props.active ? '#f39c12' : 'white'};
  color: ${props => props.active ? 'white' : '#f39c12'};
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.85em;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.active ? '#e67e22' : '#fff3cd'};
  }
`;

const GranularityButton = styled.button`
  padding: 4px 10px;
  border: 2px solid #e67e22;
  background: ${props => props.active ? '#e67e22' : 'white'};
  color: ${props => props.active ? 'white' : '#e67e22'};
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.8em;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.active ? '#d35400' : '#fdeaa7'};
  }
`;

const TrafficVisuals = ({ sensors }) => {
  const [chartData, setChartData] = useState({
    vehicleFlow: null,
    speedDistribution: null,
    waitTimeAnalysis: null,
    trafficStatus: null
  });
  const [historicalData, setHistoricalData] = useState([]);
  const [timePeriod, setTimePeriod] = useState('1hour');
  const [granularity, setGranularity] = useState('1min');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadHistoricalData(timePeriod, granularity);
  }, [timePeriod, granularity]);

  useEffect(() => {
    if (sensors && sensors.length > 0 && historicalData.length > 0) {
      const trafficSensors = sensors.filter(s => s.sensor_type === 'traffic_loop');
      generateChartData(trafficSensors);
    }
  }, [sensors, historicalData]);

  const loadHistoricalData = async (period, granularityLevel) => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/traffic/historical?period=${period}&granularity=${granularityLevel}`);
      setHistoricalData(response.data.historical_data);
    } catch (err) {
      console.error('Error loading historical data:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateChartData = (trafficSensors) => {
    // Vehicle Flow Over Time using real historical data with configurable granularity
    const timeGroups = {};
    historicalData.forEach(item => {
      if (item.vehicle_count_per_min !== '-' && item.timestamp) {
        const date = new Date(item.timestamp);
        let timeKey;
        
        // Group by granularity level
        switch(granularity) {
          case '1min':
            timeKey = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
            break;
          case '5min':
            const fiveMinGroup = Math.floor(date.getMinutes() / 5) * 5;
            timeKey = `${date.getHours().toString().padStart(2, '0')}:${fiveMinGroup.toString().padStart(2, '0')}`;
            break;
          case '30min':
            const thirtyMinGroup = Math.floor(date.getMinutes() / 30) * 30;
            timeKey = `${date.getHours().toString().padStart(2, '0')}:${thirtyMinGroup.toString().padStart(2, '0')}`;
            break;
          case '1hour':
            timeKey = `${date.getHours().toString().padStart(2, '0')}:00`;
            break;
          case '1day':
            timeKey = `${date.getMonth()+1}/${date.getDate()}`;
            break;
          default:
            timeKey = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        }
        
        // Add date prefix for longer periods
        if (timePeriod === '2days' || timePeriod === '1week') {
          timeKey = `${date.getMonth()+1}/${date.getDate()} ${timeKey}`;
        }
        
        if (!timeGroups[timeKey]) timeGroups[timeKey] = [];
        timeGroups[timeKey].push(parseFloat(item.vehicle_count_per_min) || 0);
      }
    });

    const timeKeys = Object.keys(timeGroups).sort();
    const avgData = timeKeys.map(key => {
      const values = timeGroups[key];
      return values.reduce((sum, val) => sum + val, 0) / values.length;
    });

    const vehicleFlowData = {
      labels: timeKeys.length > 0 ? timeKeys : trafficSensors.map(s => s.sensor_id.replace('Loop-', 'L')),
      datasets: [
        {
          label: timeKeys.length > 0 ? `Avg Vehicles/min (${granularity} intervals)` : 'Current Vehicles/min',
          data: timeKeys.length > 0 ? avgData : trafficSensors.map(s => parseFloat(s.vehicle_count_per_min) || 0),
          borderColor: '#f39c12',
          backgroundColor: 'rgba(243, 156, 18, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
        }
      ]
    };

    // Speed Distribution using real historical data
    const speedRanges = ['0-20', '21-40', '41-60', '61-80', '80+'];
    const speedCounts = [0, 0, 0, 0, 0];
    
    historicalData.forEach(item => {
      if (item.avg_speed_kmh !== '-' && item.avg_speed_kmh !== null) {
        const speed = parseFloat(item.avg_speed_kmh) || 0;
        if (speed <= 20) speedCounts[0]++;
        else if (speed <= 40) speedCounts[1]++;
        else if (speed <= 60) speedCounts[2]++;
        else if (speed <= 80) speedCounts[3]++;
        else speedCounts[4]++;
      }
    });

    const speedDistributionData = {
      labels: speedRanges.map(range => `${range} km/h`),
      datasets: [
        {
          label: 'Number of Sensors',
          data: speedCounts,
          backgroundColor: [
            '#e74c3c',
            '#f39c12',
            '#f1c40f',
            '#2ecc71',
            '#27ae60'
          ],
          borderColor: [
            '#c0392b',
            '#e67e22',
            '#f39c12',
            '#27ae60',
            '#229954'
          ],
          borderWidth: 1,
        }
      ]
    };

    // Wait Time Analysis using real historical data
    const waitTimeGroups = {};
    historicalData.forEach(item => {
      if (item.avg_wait_time_s !== '-' && item.timestamp) {
        const hour = new Date(item.timestamp).getHours();
        const hourKey = `${hour.toString().padStart(2, '0')}:00`;
        if (!waitTimeGroups[hourKey]) waitTimeGroups[hourKey] = [];
        waitTimeGroups[hourKey].push(parseFloat(item.avg_wait_time_s) || 0);
      }
    });

    const waitHours = Object.keys(waitTimeGroups).sort();
    const avgWaitData = waitHours.map(hour => {
      const values = waitTimeGroups[hour];
      return values.reduce((sum, val) => sum + val, 0) / values.length;
    });

    const waitTimeData = {
      labels: waitHours.length > 0 ? waitHours : trafficSensors.map(s => s.sensor_id.replace('Loop-', 'L')),
      datasets: [
        {
          label: waitHours.length > 0 ? 'Avg Wait Time by Hour (s)' : 'Current Wait Time (s)',
          data: waitHours.length > 0 ? avgWaitData : trafficSensors.map(s => parseFloat(s.avg_wait_time_s) || 0),
          borderColor: '#e74c3c',
          backgroundColor: 'rgba(231, 76, 60, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
        }
      ]
    };

    // Traffic Status Distribution using current sensor data (real-time status)
    const statusCounts = { OK: 0, WARN: 0, ALERT: 0, UNKNOWN: 0 };
    trafficSensors.forEach(sensor => {
      const status = sensor.status || 'UNKNOWN';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    const trafficStatusData = {
      labels: Object.keys(statusCounts),
      datasets: [
        {
          data: Object.values(statusCounts),
          backgroundColor: [
            '#2ecc71',
            '#f39c12',
            '#e74c3c',
            '#95a5a6'
          ],
          borderColor: [
            '#27ae60',
            '#e67e22',
            '#c0392b',
            '#7f8c8d'
          ],
          borderWidth: 2,
        }
      ]
    };

    setChartData({
      vehicleFlow: vehicleFlowData,
      speedDistribution: speedDistributionData,
      waitTimeAnalysis: waitTimeData,
      trafficStatus: trafficStatusData
    });
  };

  const calculateStats = () => {
    const trafficSensors = sensors.filter(s => s.sensor_type === 'traffic_loop');
    
    const totalVehicles = trafficSensors.reduce((sum, s) => 
      sum + (parseFloat(s.vehicle_count_per_min) || 0), 0);
    
    const avgSpeed = trafficSensors.reduce((sum, s) => 
      sum + (parseFloat(s.avg_speed_kmh) || 0), 0) / trafficSensors.length;
    
    const avgWaitTime = trafficSensors.reduce((sum, s) => 
      sum + (parseFloat(s.avg_wait_time_s) || 0), 0) / trafficSensors.length;
    
    const activeSensors = trafficSensors.filter(s => 
      s.vehicle_count_per_min !== '-' && s.vehicle_count_per_min !== null).length;

    return {
      totalVehicles: totalVehicles.toFixed(0),
      avgSpeed: avgSpeed.toFixed(1),
      avgWaitTime: avgWaitTime.toFixed(1),
      activeSensors
    };
  };

  const stats = calculateStats();

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
      },
    },
  };

  return (
    <div>
      <StatsGrid>
        <StatBox>
          <StatValue>{stats.totalVehicles}</StatValue>
          <StatLabel>Total Vehicles/min</StatLabel>
        </StatBox>
        <StatBox>
          <StatValue>{stats.avgSpeed}</StatValue>
          <StatLabel>Avg Speed (km/h)</StatLabel>
        </StatBox>
        <StatBox>
          <StatValue>{stats.avgWaitTime}</StatValue>
          <StatLabel>Avg Wait Time (s)</StatLabel>
        </StatBox>
        <StatBox>
          <StatValue>{stats.activeSensors}</StatValue>
          <StatLabel>Active Sensors</StatLabel>
        </StatBox>
      </StatsGrid>

      <VisualsContainer>
        <ChartCard>
          <ChartTitle>🚗 Vehicle Flow Over Time</ChartTitle>
          <ControlsContainer>
            <ControlGroup>
              <ControlLabel>Time Period:</ControlLabel>
              <TimeSelector>
                <TimeButton 
                  active={timePeriod === '1hour'} 
                  onClick={() => setTimePeriod('1hour')}
                >
                  1 Hour
                </TimeButton>
                <TimeButton 
                  active={timePeriod === '2days'} 
                  onClick={() => setTimePeriod('2days')}
                >
                  2 Days
                </TimeButton>
                <TimeButton 
                  active={timePeriod === '1week'} 
                  onClick={() => setTimePeriod('1week')}
                >
                  1 Week
                </TimeButton>
              </TimeSelector>
            </ControlGroup>
            <ControlGroup>
              <ControlLabel>Granularity:</ControlLabel>
              <TimeSelector>
                <GranularityButton 
                  active={granularity === '1min'} 
                  onClick={() => setGranularity('1min')}
                >
                  1 Min
                </GranularityButton>
                <GranularityButton 
                  active={granularity === '5min'} 
                  onClick={() => setGranularity('5min')}
                >
                  5 Min
                </GranularityButton>
                <GranularityButton 
                  active={granularity === '30min'} 
                  onClick={() => setGranularity('30min')}
                >
                  30 Min
                </GranularityButton>
                <GranularityButton 
                  active={granularity === '1hour'} 
                  onClick={() => setGranularity('1hour')}
                >
                  1 Hour
                </GranularityButton>
                <GranularityButton 
                  active={granularity === '1day'} 
                  onClick={() => setGranularity('1day')}
                >
                  1 Day
                </GranularityButton>
              </TimeSelector>
            </ControlGroup>
          </ControlsContainer>
          <ChartWrapper>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                Loading...
              </div>
            ) : chartData.vehicleFlow ? (
              <Line data={chartData.vehicleFlow} options={chartOptions} />
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#7f8c8d' }}>
                No data available
              </div>
            )}
          </ChartWrapper>
        </ChartCard>

        <ChartCard>
          <ChartTitle>⚡ Speed Distribution</ChartTitle>
          <ChartWrapper>
            {chartData.speedDistribution && (
              <Bar data={chartData.speedDistribution} options={chartOptions} />
            )}
          </ChartWrapper>
        </ChartCard>

        <ChartCard>
          <ChartTitle>⏱️ Wait Time Analysis</ChartTitle>
          <ChartWrapper>
            {chartData.waitTimeAnalysis && (
              <Line data={chartData.waitTimeAnalysis} options={chartOptions} />
            )}
          </ChartWrapper>
        </ChartCard>

        <ChartCard>
          <ChartTitle>📊 Traffic Status Distribution</ChartTitle>
          <ChartWrapper>
            {chartData.trafficStatus && (
              <Doughnut data={chartData.trafficStatus} options={doughnutOptions} />
            )}
          </ChartWrapper>
        </ChartCard>
      </VisualsContainer>
    </div>
  );
};

export default TrafficVisuals; 