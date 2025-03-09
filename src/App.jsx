import React from "react";
import TimetableTable from "./components/TimetableTable.jsx";

import "./App.css"; // Ensure styles are applied

function App() {
  return (
    <div className="app">
      <h1 className="title">Guru Nanak Fifth Centenary School, Mussoorie</h1>
      <TimetableTable />
    </div>
  );
}

export default App;
