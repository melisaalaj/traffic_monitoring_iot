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
import { Line, Bar, Doughnut, Scatter } from 'react-chartjs-2';

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
  border-left: 4px solid #27ae60;
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
  border-left: 3px solid ${props => props.color || '#27ae60'};
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

const QualityIndicator = styled.div`
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8em;
  font-weight: 600;
  background: ${props => {
    switch(props.level) {
      case 'Good': return '#2ecc71';
      case 'Moderate': return '#f39c12';
      case 'Unhealthy': return '#e74c3c';
      default: return '#95a5a6';
    }
  }};
  color: white;
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
  border: 2px solid #27ae60;
  background: ${props => props.active ? '#27ae60' : 'white'};
  color: ${props => props.active ? 'white' : '#27ae60'};
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.85em;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.active ? '#229954' : '#d5f4e6'};
  }
`;

const GranularityButton = styled.button`
  padding: 4px 10px;
  border: 2px solid #229954;
  background: ${props => props.active ? '#229954' : 'white'};
  color: ${props => props.active ? 'white' : '#229954'};
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.8em;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.active ? '#1e8449' : '#d5f4e6'};
  }
`;

const AirQualityVisuals = ({ sensors }) => {
  const [chartData, setChartData] = useState({
    pm25Levels: null,
    temperatureDistribution: null,
    airQualityIndex: null,
    correlationAnalysis: null
  });
  const [historicalData, setHistoricalData] = useState([]);
  const [timePeriod, setTimePeriod] = useState('1hour');
  const [granularity, setGranularity] = useState('1min');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadHistoricalData(timePeriod, granularity);
  }, [timePeriod, granularity]);

  const loadHistoricalData = async (period, granularityLevel) => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/air_quality/historical?period=${period}&granularity=${granularityLevel}`);
      setHistoricalData(response.data.historical_data || []);
    } catch (err) {
      console.error('Error loading air quality historical data:', err);
      setHistoricalData([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const generateChartData = React.useCallback((airSensors) => {
    // PM2.5 Levels Over Time using real historical data
    const pm25TimeGroups = {};
    historicalData.forEach(item => {
      if (item.pm25 !== '-' && item.timestamp) {
        const hour = new Date(item.timestamp).getHours();
        const hourKey = `${hour.toString().padStart(2, '0')}:00`;
        if (!pm25TimeGroups[hourKey]) pm25TimeGroups[hourKey] = [];
        pm25TimeGroups[hourKey].push(parseFloat(item.pm25) || 0);
      }
    });

    const pm25Hours = Object.keys(pm25TimeGroups).sort();
    const avgPM25Data = pm25Hours.map(hour => {
      const values = pm25TimeGroups[hour];
      return values.reduce((sum, val) => sum + val, 0) / values.length;
    });

    const pm25Data = {
      labels: pm25Hours.length > 0 ? pm25Hours : airSensors.map(s => s.sensor_id.replace('Air-', 'A')),
      datasets: [
        {
          label: pm25Hours.length > 0 ? 'Avg PM2.5 by Hour (μg/m³)' : 'Current PM2.5 (μg/m³)',
          data: pm25Hours.length > 0 ? avgPM25Data : airSensors.map(s => parseFloat(s.pm25) || 0),
          borderColor: '#27ae60',
          backgroundColor: 'rgba(39, 174, 96, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
        },
        {
          label: 'WHO Guideline (15 μg/m³)',
          data: new Array(pm25Hours.length > 0 ? pm25Hours.length : airSensors.length).fill(15),
          borderColor: '#e74c3c',
          backgroundColor: 'rgba(231, 76, 60, 0.1)',
          borderWidth: 2,
          borderDash: [5, 5],
          fill: false,
        }
      ]
    };

    // Temperature Distribution using historical data or current sensor data as fallback
    const tempRanges = ['<10°C', '10-15°C', '16-20°C', '21-25°C', '26-30°C', '>30°C'];
    const tempCounts = [0, 0, 0, 0, 0, 0];
    
    // Use historical data if available, otherwise use current sensor data
    const tempDataSource = historicalData.length > 0 ? historicalData : airSensors;
    
    tempDataSource.forEach(item => {
      const tempValue = historicalData.length > 0 ? item.temp_c : item.temp_c;
      if (tempValue !== '-' && tempValue !== null) {
        const temp = parseFloat(tempValue) || 0;
        if (temp < 10) tempCounts[0]++;
        else if (temp <= 15) tempCounts[1]++;
        else if (temp <= 20) tempCounts[2]++;
        else if (temp <= 25) tempCounts[3]++;
        else if (temp <= 30) tempCounts[4]++;
        else tempCounts[5]++;
      }
    });

    const temperatureDistributionData = {
      labels: tempRanges,
      datasets: [
        {
          label: historicalData.length > 0 ? 'Historical Data Points' : 'Current Sensors',
          data: tempCounts,
          backgroundColor: [
            '#3498db',
            '#2ecc71',
            '#f1c40f',
            '#f39c12',
            '#e67e22',
            '#e74c3c'
          ],
          borderColor: [
            '#2980b9',
            '#27ae60',
            '#f39c12',
            '#e67e22',
            '#d35400',
            '#c0392b'
          ],
          borderWidth: 1,
        }
      ]
    };

    // Air Quality Index Distribution using historical data or current sensor data as fallback
    const aqiCounts = { Good: 0, Moderate: 0, 'Unhealthy for Sensitive': 0, Unhealthy: 0, 'Very Unhealthy': 0 };
    const aqiDataSource = historicalData.length > 0 ? historicalData : airSensors;
    
    aqiDataSource.forEach(item => {
      const pm25Value = historicalData.length > 0 ? item.pm25 : item.pm25;
      if (pm25Value !== '-' && pm25Value !== null) {
        const pm25 = parseFloat(pm25Value) || 0;
        const level = getAirQualityLevel(pm25);
        aqiCounts[level]++;
      }
    });

    const airQualityIndexData = {
      labels: Object.keys(aqiCounts).filter(key => aqiCounts[key] > 0),
      datasets: [
        {
          data: Object.values(aqiCounts).filter(count => count > 0),
          backgroundColor: [
            '#2ecc71',
            '#f39c12',
            '#e67e22',
            '#e74c3c',
            '#8e44ad'
          ],
          borderColor: [
            '#27ae60',
            '#e67e22',
            '#d35400',
            '#c0392b',
            '#7d3c98'
          ],
          borderWidth: 2,
        }
      ]
    };

    // PM2.5 vs Temperature Correlation using real historical data
    const correlationPoints = historicalData
      .filter(item => item.pm25 !== '-' && item.temp_c !== '-' && item.pm25 !== null && item.temp_c !== null)
      .map(item => ({
        x: parseFloat(item.temp_c) || 0,
        y: parseFloat(item.pm25) || 0,
        sensorId: item.sensor_id
      }));

    const correlationData = {
      datasets: [
        {
          label: 'PM2.5 vs Temperature (Historical)',
          data: correlationPoints.length > 0 ? correlationPoints : airSensors.map(sensor => ({
            x: parseFloat(sensor.temp_c) || 0,
            y: parseFloat(sensor.pm25) || 0,
            sensorId: sensor.sensor_id
          })),
          backgroundColor: 'rgba(39, 174, 96, 0.6)',
          borderColor: '#27ae60',
          borderWidth: 1,
        }
      ]
    };

    setChartData({
      pm25Levels: pm25Data,
      temperatureDistribution: temperatureDistributionData,
      airQualityIndex: airQualityIndexData,
      correlationAnalysis: correlationData
    });
  }, []);

  useEffect(() => {
    if (sensors && sensors.length > 0) {
      const airSensors = sensors.filter(s => s.sensor_type === 'air_quality');
      if (airSensors.length > 0) {
        generateChartData(airSensors);
      }
    }
  }, [sensors, historicalData, generateChartData]);

  const getAirQualityLevel = (pm25) => {
    if (pm25 <= 12) return 'Good';
    if (pm25 <= 35.4) return 'Moderate';
    if (pm25 <= 55.4) return 'Unhealthy for Sensitive';
    if (pm25 <= 150.4) return 'Unhealthy';
    return 'Very Unhealthy';
  };



  const calculateStats = () => {
    const airSensors = sensors.filter(s => s.sensor_type === 'air_quality');
    
    const avgPM25 = airSensors.reduce((sum, s) => 
      sum + (parseFloat(s.pm25) || 0), 0) / airSensors.length;
    
    const avgTemp = airSensors.reduce((sum, s) => 
      sum + (parseFloat(s.temp_c) || 0), 0) / airSensors.length;
    
    const maxPM25 = Math.max(...airSensors.map(s => parseFloat(s.pm25) || 0));
    
    const goodAirQuality = airSensors.filter(s => 
      getAirQualityLevel(parseFloat(s.pm25) || 0) === 'Good').length;
    
    const activeSensors = airSensors.filter(s => 
      s.pm25 !== '-' && s.pm25 !== null).length;

    return {
      avgPM25: avgPM25.toFixed(1),
      avgTemp: avgTemp.toFixed(1),
      maxPM25: maxPM25.toFixed(1),
      goodAirQuality,
      activeSensors,
      overallQuality: getAirQualityLevel(avgPM25)
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

  const scatterOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.raw.sensorId}: PM2.5 ${context.parsed.y}μg/m³, Temp ${context.parsed.x}°C`;
          }
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Temperature (°C)'
        }
      },
      y: {
        title: {
          display: true,
          text: 'PM2.5 (μg/m³)'
        },
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
        <StatBox color="#27ae60">
          <StatValue>{stats.avgPM25}</StatValue>
          <StatLabel>Avg PM2.5 (μg/m³)</StatLabel>
        </StatBox>
        <StatBox color="#3498db">
          <StatValue>{stats.avgTemp}</StatValue>
          <StatLabel>Avg Temperature (°C)</StatLabel>
        </StatBox>
        <StatBox color="#e74c3c">
          <StatValue>{stats.maxPM25}</StatValue>
          <StatLabel>Max PM2.5 (μg/m³)</StatLabel>
        </StatBox>
        <StatBox color="#2ecc71">
          <StatValue>{stats.goodAirQuality}</StatValue>
          <StatLabel>Good Quality Sensors</StatLabel>
        </StatBox>
        <StatBox color="#f39c12">
          <StatValue>{stats.activeSensors}</StatValue>
          <StatLabel>Active Sensors</StatLabel>
        </StatBox>
        <StatBox>
          <QualityIndicator level={stats.overallQuality}>
            {stats.overallQuality}
          </QualityIndicator>
          <StatLabel style={{marginTop: '8px'}}>Overall Quality</StatLabel>
        </StatBox>
      </StatsGrid>

      <VisualsContainer>
        <ChartCard>
          <ChartTitle>🌬️ PM2.5 Levels by Sensor</ChartTitle>
          <ChartWrapper>
            {chartData.pm25Levels && (
              <Line data={chartData.pm25Levels} options={chartOptions} />
            )}
          </ChartWrapper>
        </ChartCard>

        <ChartCard>
          <ChartTitle>🌡️ Temperature Distribution</ChartTitle>
          <ChartWrapper>
            {chartData.temperatureDistribution && (
              <Bar data={chartData.temperatureDistribution} options={chartOptions} />
            )}
          </ChartWrapper>
        </ChartCard>

        <ChartCard>
          <ChartTitle>📊 Air Quality Index Distribution</ChartTitle>
          <ChartWrapper>
            {chartData.airQualityIndex && (
              <Doughnut data={chartData.airQualityIndex} options={doughnutOptions} />
            )}
          </ChartWrapper>
        </ChartCard>

        <ChartCard>
          <ChartTitle>🔗 PM2.5 vs Temperature Correlation</ChartTitle>
          <ChartWrapper>
            {chartData.correlationAnalysis && (
              <Scatter data={chartData.correlationAnalysis} options={scatterOptions} />
            )}
          </ChartWrapper>
        </ChartCard>
      </VisualsContainer>
    </div>
  );
};

export default AirQualityVisuals; 