import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "../App.css";

const TimetableTable = () => {
  const classes = ["KG","I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"];

  const [timetableData, setTimetableData] = useState(null);
  const [currentDay, setCurrentDay] = useState("");
  const [currentSlot, setCurrentSlot] = useState(null);
  const [currentTime, setCurrentTime] = useState("");

  const bellRef = useRef(null);
  const lastSlot = useRef(null);

  // ✅ ENABLE SOUND AFTER FIRST CLICK
  useEffect(() => {
    const enableSound = () => {
      bellRef.current?.play().then(() => {
        bellRef.current.pause();
        bellRef.current.currentTime = 0;
      }).catch(() => {});
      document.removeEventListener("click", enableSound);
    };
    document.addEventListener("click", enableSound);
  }, []);

  // ✅ FETCH DATA
  useEffect(() => {
    fetch("/data/timetable.json")
      .then(res => res.json())
      .then(data => setTimetableData(data))
      .catch(err => console.error(err));
  }, []);

  // ✅ TIME PARSER
  const parseTime = (timeStr) => {
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/);
    if (!match) return null;

    let [_, h, m, p] = match;
    h = parseInt(h);
    m = parseInt(m);

    if (p === "PM" && h !== 12) h += 12;
    if (p === "AM" && h === 12) h = 0;

    return h * 60 + m;
  };

  // ✅ SLOT + BELL
  useEffect(() => {
    if (!timetableData) return;

    const update = () => {
      const now = new Date();
      const mins = now.getHours() * 60 + now.getMinutes();
      const day = now.toLocaleString("en-US", { weekday: "long" });

      setCurrentDay(day);

      const allSlots = [
        ...(timetableData.schedule?.[day]?.classes || []),
        ...(timetableData.commonRoutine || [])
      ];

      const active = allSlots.find(slot => {
        if (!slot.time?.includes("TO")) return false;
        const [start, end] = slot.time.split("TO").map(t => parseTime(t.trim()));
        return start && end && mins >= start && mins <= end;
      });

      // 🔔 BELL
      if (
        active?.time &&
        active.bell !== false &&
        lastSlot.current !== active.time
      ) {
        lastSlot.current = active.time;
        bellRef.current?.play().catch(() => {});
      }

      setCurrentSlot(active || null);
    };

    update();
    const i = setInterval(update, 1000);
    return () => clearInterval(i);
  }, [timetableData]);

  // ✅ CLOCK
  useEffect(() => {
    const i = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(i);
  }, []);

  return (
    <div className="fullscreen-container">

      {/* 🔔 AUDIO */}
      <audio ref={bellRef} src="/sounds/bell.mp3" />

      {/* HEADER */}
      <div className="header">
        <h1>📅 School Timetable</h1>
        <h2>{currentDay} | {currentTime}</h2>
      </div>

      {/* MAIN DISPLAY */}
      <div className="main-display">
        <AnimatePresence mode="wait">
          {currentSlot && (
            <motion.div
              key={currentSlot.time}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.4 }}
              className="card"
            >
              {currentSlot.break || currentSlot.remedial ? (
                <h1 className="big-text">
                  {currentSlot.break || currentSlot.remedial}
                </h1>
              ) : (
                <table className="timetable">
                  <thead>
                    <tr>
                      <th>Class</th>
                      <th>Vincent Hill</th>
                      <th>Shangri-la</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classes.map(cls => {
                      const vh = currentSlot.subjects?.["Vincent Hill"]?.[cls];
                      const sh = currentSlot.subjects?.["Shangri-la"]?.[cls];

                      return (
                        <tr key={cls}>
                          <td>{cls}</td>
                          <td>{vh?.subject ? `${vh.subject} (${vh.teacher})` : "-"}</td>
                          <td>{sh?.subject ? `${sh.subject} (${sh.teacher})` : "-"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TimetableTable;
