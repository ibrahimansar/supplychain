import React, { useState, useMemo, useRef } from 'react';

/**
 * TimelineChart Component
 * Displays a horizontal timeline showing the lifespan of each person in the family tree.
 * X-axis: Years (from oldest possible year to current year)
 * Y-axis: Each person with a birth year gets a horizontal bar showing their lived years
 */
const TimelineChart = ({ treeData, onPersonClick }) => {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const containerRef = useRef(null);
  const currentYear = new Date().getFullYear();
  
  // Extract all people from the tree data
  const allPeople = useMemo(() => {
    const people = [];
    const seenIds = new Set();

    const traverseTree = (node) => {
      if (!node) return;

      const person = node.person || node;
      if (person && person.id && person.birthYear && !seenIds.has(person.id)) {
        seenIds.add(person.id);
        people.push({
          id: person.id,
          name: person.name,
          arabicName: person.arabicName,
          birthYear: person.birthYear,
          deathYear: person.deathYear,
          generation: person.generation || 1,
          gender: person.gender,
          title: person.title,
          noHeir: person.noHeir
        });
      }

      // Process spouse if available
      if (node.spouse) {
        const spouse = node.spouse;
        if (spouse.id && spouse.birthYear && !seenIds.has(spouse.id)) {
          seenIds.add(spouse.id);
          people.push({
            id: spouse.id,
            name: spouse.name,
            arabicName: spouse.arabicName,
            birthYear: spouse.birthYear,
            deathYear: spouse.deathYear,
            generation: spouse.generation || 1,
            gender: spouse.gender,
            title: spouse.title,
            noHeir: spouse.noHeir,
            isSpouse: true
          });
        }
      }

      // Process children
      if (node.children && Array.isArray(node.children)) {
        node.children.forEach(child => traverseTree(child));
      }
    };

    traverseTree(treeData);
    
    // Sort by birth year (oldest first), then by generation
    return people.sort((a, b) => {
      if (a.birthYear !== b.birthYear) return a.birthYear - b.birthYear;
      return (a.generation || 0) - (b.generation || 0);
    });
  }, [treeData]);
  
  // Calculate timeline bounds
  const { minYear, maxYear } = useMemo(() => {
    if (allPeople.length === 0) {
      return { minYear: currentYear - 100, maxYear: currentYear };
    }
    
    const birthYears = allPeople.map(p => p.birthYear);
    const deathYears = allPeople.filter(p => p.deathYear).map(p => p.deathYear);
    
    const minYear = Math.min(...birthYears) - 10; // Add padding
    const maxYear = Math.max(currentYear, ...deathYears) + 5;
    
    return { minYear, maxYear };
  }, [allPeople, currentYear]);
  
  const yearRange = maxYear - minYear;
  
  // Calculate year markers
  const yearMarkers = useMemo(() => {
    const markers = [];
    const interval = yearRange <= 100 ? 10 : yearRange <= 200 ? 20 : 50;
    const startYear = Math.ceil(minYear / interval) * interval;
    
    for (let year = startYear; year <= maxYear; year += interval) {
      markers.push(year);
    }
    
    return markers;
  }, [minYear, maxYear, yearRange]);
  
  // Color palette for generations
  const getGenerationColor = (generation) => {
    const colors = [
      'bg-blue-500 dark:bg-blue-600',      // Gen 1
      'bg-green-500 dark:bg-green-600',    // Gen 2
      'bg-purple-500 dark:bg-purple-600',  // Gen 3
      'bg-orange-500 dark:bg-orange-600',  // Gen 4
      'bg-pink-500 dark:bg-pink-600',      // Gen 5
      'bg-teal-500 dark:bg-teal-600',      // Gen 6
      'bg-indigo-500 dark:bg-indigo-600',  // Gen 7
      'bg-red-500 dark:bg-red-600',        // Gen 8
      'bg-yellow-500 dark:bg-yellow-600',  // Gen 9
      'bg-cyan-500 dark:bg-cyan-600',      // Gen 10+
    ];
    const idx = Math.min((generation || 1) - 1, colors.length - 1);
    return colors[idx];
  };
  
  // Calculate bar position and width
  const getBarStyle = (person) => {
    const birth = person.birthYear;
    const death = person.deathYear || currentYear; // If no death year, assume still alive
    
    const leftPercent = ((birth - minYear) / yearRange) * 100;
    const widthPercent = ((death - birth) / yearRange) * 100;
    
    return {
      left: `${leftPercent}%`,
      width: `${Math.max(widthPercent, 0.5)}%` // Minimum width for visibility
    };
  };
  
  // Handle zoom
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.5, 5));
  };
  
  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.5, 0.5));
  };
  
  const handleZoomReset = () => {
    setZoom(1);
    setOffset(0);
  };
  
  // Handle drag/pan
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart(e.clientX - offset);
  };
  
  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const newOffset = e.clientX - dragStart;
    setOffset(newOffset);
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  // Handle touch events for mobile
  const handleTouchStart = (e) => {
    setIsDragging(true);
    setDragStart(e.touches[0].clientX - offset);
  };
  
  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const newOffset = e.touches[0].clientX - dragStart;
    setOffset(newOffset);
  };
  
  const handleTouchEnd = () => {
    setIsDragging(false);
  };
  
  if (!treeData) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        Loading timeline data...
      </div>
    );
  }
  
  if (allPeople.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        <svg className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <p className="text-lg font-medium">No Timeline Data</p>
        <p className="text-sm">Add birth years to family members to see them on the timeline.</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Family Timeline
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {allPeople.length} people with birth years • {minYear} - {maxYear}
          </p>
        </div>
        
        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomOut}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            title="Zoom Out"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <button
            onClick={handleZoomReset}
            className="px-3 py-1 text-xs rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            title="Reset Zoom"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            onClick={handleZoomIn}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            title="Zoom In"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
        <span className="text-xs text-gray-500 dark:text-gray-400 me-2">Generations:</span>
        {[1, 2, 3, 4, 5].map(gen => (
          <div key={gen} className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded ${getGenerationColor(gen)}`}></div>
            <span className="text-xs text-gray-600 dark:text-gray-400">Gen {gen}</span>
          </div>
        ))}
        <div className="flex items-center gap-1 ms-4">
          <div className="w-3 h-3 rounded bg-gray-400 opacity-50"></div>
          <span className="text-xs text-gray-600 dark:text-gray-400">Still Living (estimated)</span>
        </div>
      </div>
      
      {/* Timeline Container */}
      <div 
        ref={containerRef}
        className="relative overflow-hidden select-none"
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div 
          className="transition-transform duration-100"
          style={{ 
            transform: `translateX(${offset}px) scaleX(${zoom})`,
            transformOrigin: 'left center'
          }}
        >
          {/* Year Axis */}
          <div className="relative h-8 border-b border-gray-300 dark:border-gray-600 mb-2">
            {yearMarkers.map(year => {
              const leftPercent = ((year - minYear) / yearRange) * 100;
              return (
                <div
                  key={year}
                  className="absolute flex flex-col items-center"
                  style={{ left: `${leftPercent}%` }}
                >
                  <div className="w-px h-3 bg-gray-400 dark:bg-gray-500"></div>
                  <span className="text-xs text-gray-600 dark:text-gray-400 mt-1 whitespace-nowrap">
                    {year}
                  </span>
                </div>
              );
            })}
            
            {/* Current Year Indicator */}
            <div
              className="absolute flex flex-col items-center"
              style={{ left: `${((currentYear - minYear) / yearRange) * 100}%` }}
            >
              <div className="w-0.5 h-full bg-red-500"></div>
              <span className="text-xs text-red-500 font-medium mt-1">{currentYear}</span>
            </div>
          </div>
          
          {/* People Bars */}
          <div className="space-y-1">
            {allPeople.map((person, index) => {
              const barStyle = getBarStyle(person);
              const isLiving = !person.deathYear;
              
              return (
                <div 
                  key={person.id}
                  className="relative h-8 group"
                >
                  {/* Name Label (fixed on left) */}
                  <div 
                    className="absolute start-0 top-0 h-full flex items-center z-10 pe-2"
                    style={{ 
                      transform: `scaleX(${1/zoom})`,
                      transformOrigin: 'left center'
                    }}
                  >
                    <span className="text-xs text-gray-700 dark:text-gray-300 truncate max-w-[120px] bg-white dark:bg-gray-800 px-1">
                      {person.name}
                      {person.isSpouse && <span className="text-gray-400 ms-1">(spouse)</span>}
                    </span>
                  </div>
                  
                  {/* Life Bar */}
                  <div
                    onClick={() => onPersonClick && onPersonClick(person.id)}
                    className={`absolute h-6 top-1 rounded cursor-pointer transition-all duration-200 hover:h-7 hover:top-0.5 hover:shadow-lg ${getGenerationColor(person.generation)} ${isLiving ? 'opacity-70' : ''}`}
                    style={barStyle}
                    title={`${person.name}${person.title ? ` (${person.title})` : ''}\nBirth: ${person.birthYear}\n${person.deathYear ? `Death: ${person.deathYear}` : 'Still living'}${person.noHeir ? '\n⊘ No heir' : ''}`}
                  >
                    {/* Bar Content */}
                    <div 
                      className="h-full flex items-center justify-between px-2 overflow-hidden"
                      style={{ 
                        transform: `scaleX(${1/zoom})`,
                        transformOrigin: 'left center'
                      }}
                    >
                      <span className="text-[10px] text-white font-medium truncate">
                        {person.birthYear}
                      </span>
                      {person.deathYear && (
                        <span className="text-[10px] text-white font-medium">
                          {person.deathYear}
                        </span>
                      )}
                    </div>
                    
                    {/* No Heir Indicator */}
                    {person.noHeir && (
                      <div 
                        className="absolute -right-1 -top-1 bg-amber-500 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center"
                        style={{ 
                          transform: `scaleX(${1/zoom})`,
                          transformOrigin: 'center'
                        }}
                      >
                        ⊘
                      </div>
                    )}
                  </div>
                  
                  {/* Hover Tooltip */}
                  <div 
                    className="absolute start-1/2 -translate-x-1/2 bottom-full mb-2 bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20"
                    style={{ 
                      transform: `translateX(-50%) scaleX(${1/zoom})`,
                      transformOrigin: 'center'
                    }}
                  >
                    <strong>{person.name}</strong>
                    {person.arabicName && <span className="ms-2 arabic-text">{person.arabicName}</span>}
                    <br />
                    {person.birthYear} - {person.deathYear || 'Present'}
                    {person.deathYear && <span className="ms-2">({person.deathYear - person.birthYear} years)</span>}
                    {person.noHeir && <span className="ms-2 text-amber-400">⊘ No heir</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Footer Stats */}
      <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
        <div>
          <span className="font-medium">Oldest:</span>{' '}
          {allPeople.length > 0 && allPeople[0].name} ({allPeople.length > 0 && allPeople[0].birthYear})
        </div>
        <div>
          <span className="font-medium">Youngest:</span>{' '}
          {allPeople.length > 0 && allPeople[allPeople.length - 1].name} ({allPeople.length > 0 && allPeople[allPeople.length - 1].birthYear})
        </div>
        <div>
          <span className="font-medium">Time Span:</span>{' '}
          {yearRange} years
        </div>
        <div>
          <span className="font-medium">Living:</span>{' '}
          {allPeople.filter(p => !p.deathYear).length}
        </div>
      </div>
      
      {/* Instructions */}
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
        Drag to pan • Use zoom controls to scale • Click a bar to view person details
      </p>
    </div>
  );
};

export default TimelineChart;
