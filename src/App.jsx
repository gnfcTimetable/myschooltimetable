import React from "react";
import TimetableTable from "./components/TimetableTable.jsx";

import "./App.css"; // Ensure styles are applied

function App() {
  return (
    <div className="app">
      <h1 className="title">School Timetable</h1>
      <TimetableTable />
    </div>
  );
}

export default App;
