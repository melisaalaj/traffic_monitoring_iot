import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

const TabContent = styled.div`
  background: rgba(255, 255, 255, 0.95);
  border-radius: 0 0 15px 15px;
  padding: 30px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
  min-height: 600px;
`;

const TableControls = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 15px;
`;

const TableSelect = styled.select`
  padding: 10px 15px;
  border: 2px solid #ecf0f1;
  border-radius: 8px;
  font-size: 16px;
  background: white;
  cursor: pointer;
`;

const RefreshButton = styled.button`
  background: #3498db;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;

  &:hover {
    background: #2980b9;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const TableDescription = styled.div`
  background: #e8f4fd;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
  color: #2c3e50;
`;

const TableContainer = styled.div`
  overflow-x: auto;
  margin-bottom: 20px;
`;

const Table = styled.table`
  width: 100%;
  min-width: 1200px;
  border-collapse: collapse;
  background: white;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 5px 15px rgba(0,0,0,0.1);
`;

const Th = styled.th`
  padding: 12px 8px;
  text-align: left;
  border-bottom: 1px solid #ecf0f1;
  background: #34495e;
  color: white;
  font-weight: 600;
  text-transform: uppercase;
  font-size: 0.85em;
  letter-spacing: 0.5px;
  white-space: nowrap;
`;

const Td = styled.td`
  padding: 12px 8px;
  text-align: left;
  border-bottom: 1px solid #ecf0f1;
  white-space: nowrap;
`;

const Tr = styled.tr`
  &:hover {
    background: #f8f9fa;
  }
`;

const Pagination = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 20px;
  gap: 5px;
  flex-wrap: wrap;
`;

const PageButton = styled.button`
  padding: 6px 12px;
  border: 1px solid #ddd;
  background: ${props => props.active ? '#3498db' : 'white'};
  color: ${props => props.active ? 'white' : 'black'};
  cursor: pointer;
  border-radius: 4px;
  font-size: 14px;
  min-width: 40px;
  transition: all 0.3s ease;

  &:hover:not(:disabled) {
    background: ${props => props.active ? '#3498db' : '#f0f0f0'};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
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

const formatColumnName = (col) => {
  return col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const formatValue = (value, column, tableName) => {
  if (value === null || value === undefined) {
    return '-';
  }
  
  if (typeof value === 'string' && value.includes('T')) {
    // Format datetime
    const date = new Date(value);
    return date.toLocaleString();
  }
  
  if (Array.isArray(value)) {
    // Format array values (like breaches)
    return value.length > 0 ? value.join(', ') : '-';
  }
  
  if (typeof value === 'number') {
    // Format numbers with appropriate decimal places
    if (column.includes('lat') || column.includes('lon')) {
      return value.toFixed(6);
    } else if (column.includes('speed') || column.includes('count') || 
               column.includes('wait') || column.includes('pm25') || 
               column.includes('temp') || column.includes('noise')) {
      return value.toFixed(2);
    } else {
      return value.toString();
    }
  }
  
  return value.toString();
};

const DataTables = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [tableData, setTableData] = useState([]);
  const [pagination, setPagination] = useState({});
  const [tableName, setTableName] = useState('aggregates_minute');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const perPage = 30;

  const loadTableData = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`/api/table_data?table=${tableName}&page=${page}&per_page=${perPage}`);
      setTableData(response.data.data);
      setPagination(response.data.pagination);
      setCurrentPage(page);
    } catch (err) {
      setError(err.message);
      console.error('Error loading table data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTableData(1);
  }, [tableName]);

  const handleTableChange = (newTableName) => {
    setTableName(newTableName);
    setCurrentPage(1);
  };

  const renderPagination = () => {
    if (pagination.pages <= 1) return null;
    
    const currentPage = pagination.page;
    const totalPages = pagination.pages;
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);
    
    // Adjust if we're near the beginning or end
    if (endPage - startPage < 4) {
      if (startPage === 1) {
        endPage = Math.min(totalPages, startPage + 4);
      } else {
        startPage = Math.max(1, endPage - 4);
      }
    }
    
    const pages = [];
    
    // Previous button
    pages.push(
      <PageButton 
        key="prev" 
        disabled={currentPage === 1} 
        onClick={() => loadTableData(currentPage - 1)}
      >
        <ChevronLeft size={14} />
      </PageButton>
    );
    
    // First page
    if (startPage > 1) {
      pages.push(
        <PageButton key={1} onClick={() => loadTableData(1)}>
          1
        </PageButton>
      );
      if (startPage > 2) {
        pages.push(
          <PageButton key="dots1" disabled>
            ...
          </PageButton>
        );
      }
    }
    
    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <PageButton 
          key={i} 
          active={i === currentPage}
          onClick={() => loadTableData(i)}
        >
          {i}
        </PageButton>
      );
    }
    
    // Last page
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push(
          <PageButton key="dots2" disabled>
            ...
          </PageButton>
        );
      }
      pages.push(
        <PageButton key={totalPages} onClick={() => loadTableData(totalPages)}>
          {totalPages}
        </PageButton>
      );
    }
    
    // Next button
    pages.push(
      <PageButton 
        key="next" 
        disabled={currentPage === totalPages} 
        onClick={() => loadTableData(currentPage + 1)}
      >
        <ChevronRight size={14} />
      </PageButton>
    );
    
    return <Pagination>{pages}</Pagination>;
  };

  const getTableDescription = () => {
    if (tableName === 'aggregates_minute') {
      return 'Traffic Data Table: Real-time sensor readings with vehicle counts, speeds, air quality, and noise levels. Data is sorted by timestamp (newest first).';
    } else {
      return 'Sensor Metadata Table: Static information about each sensor including location, type, and configuration.';
    }
  };

  return (
    <TabContent>
      <TableControls>
        <div>
          <TableSelect value={tableName} onChange={(e) => handleTableChange(e.target.value)}>
            <option value="aggregates_minute">Traffic Data (aggregates_minute)</option>
            <option value="sensor_metadata">Sensor Metadata</option>
          </TableSelect>
          <RefreshButton onClick={() => loadTableData(currentPage)} disabled={loading}>
            <RefreshCw size={16} />
            Refresh
          </RefreshButton>
        </div>
      </TableControls>
      
      <TableDescription>
        {getTableDescription()}
      </TableDescription>
      
      {error && (
        <ErrorMessage>Error loading table data: {error}</ErrorMessage>
      )}
      
      {loading ? (
        <LoadingMessage>Loading table data...</LoadingMessage>
      ) : (
        <TableContainer>
          {tableData.length > 0 ? (
            <Table>
              <thead>
                <tr>
                  {Object.keys(tableData[0]).map(column => (
                    <Th key={column}>{formatColumnName(column)}</Th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData.map((row, index) => (
                  <Tr key={index}>
                    {Object.entries(row).map(([column, value]) => (
                      <Td key={column}>
                        {formatValue(value, column, tableName)}
                      </Td>
                    ))}
                  </Tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
              No data available
            </div>
          )}
        </TableContainer>
      )}
      
      {renderPagination()}
    </TabContent>
  );
};

export default DataTables; 