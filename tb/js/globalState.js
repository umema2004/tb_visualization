// globalState.js
const globalState = {
    selectedCountry: null,
    selectedYear: null,
};

// Function to trigger updates in all visualizations
function updateVisualizations() {
    updateMap();       
    updateTimeline();  
    
    // updateTree();   
    // updateFD();     
    // updateSunburst();
}
