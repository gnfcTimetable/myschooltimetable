import React, { useState, useEffect, useMemo, useRef } from "react";
import "../App.css";

const TimetableTable = () => {
  const classes = ["KG","I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"];

  const [timetableData, setTimetableData] = useState(null);
  const [currentDay, setCurrentDay] = useState("");
  const [currentSlot, setCurrentSlot] = useState(null);
  const [nextSlot, setNextSlot] = useState(null);
  const [currentTime, setCurrentTime] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [teacherSchedule, setTeacherSchedule] = useState([]);
  const [isIdle, setIsIdle] = useState(false);

  const bellRef = useRef(null);
  const lastPlayedSlot = useRef("");

  // ✅ LOAD DATA
  useEffect(() => {
    const fetchData = () => {
      fetch("/data/timetable.json")
        .then(res => res.json())
        .then(data => setTimetableData(data))
        .catch(err => console.error(err));
    };

    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  // ✅ TIME PARSER
  const parseTime = (timeStr) => {
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (!match) return null;
    let [_, h, m, p] = match;
    h = parseInt(h); m = parseInt(m);
    if (p) {
      if (p.toUpperCase() === "PM" && h !== 12) h += 12;
      if (p.toUpperCase() === "AM" && h === 12) h = 0;
    }
    return h * 60 + m;
  };

  // ✅ SLOT + 🔊 BELL
  useEffect(() => {
    if (!timetableData) return;

    const updateSlot = () => {
      const now = new Date();
      const day = now.toLocaleString("en-US", { weekday: "long" });
      setCurrentDay(day);

      const currentMins = now.getHours() * 60 + now.getMinutes();

      const schedule = timetableData.schedule?.[day]?.classes || [];
      const common = timetableData.commonRoutine || [];

      const merged = [...schedule, ...common.map(i => ({...i, isCommonRoutine:true}))];

      const active = merged.find(item => {
        if (!item.time?.includes(" TO ")) return false;
        const [s,e] = item.time.split(" TO ");
        const start = parseTime(s.trim());
        const end = parseTime(e.trim());
        return start !== null && end !== null && currentMins >= start && currentMins < end;
      });

      setCurrentSlot(active || null);

      // 🔊 BELL
      const slotKey = active?.time || "";
      if (slotKey && lastPlayedSlot.current !== slotKey) {
        lastPlayedSlot.current = slotKey;
        if (bellRef.current) {
          bellRef.current.currentTime = 0;
          bellRef.current.play().catch(()=>{});
        }
      }

      const index = merged.findIndex(i => i === active);
      setNextSlot(merged[index + 1] || null);
    };

    updateSlot();
    const interval = setInterval(updateSlot, 60000);
    return () => clearInterval(interval);
  }, [timetableData]);

  // ✅ CLOCK
  useEffect(() => {
    const t = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // ✅ SCREENSAVER
  useEffect(() => {
    let timer;
    const reset = () => {
      setIsIdle(false);
      clearTimeout(timer);
      timer = setTimeout(() => setIsIdle(true), 10000);
    };
    window.addEventListener("mousemove", reset);
    window.addEventListener("touchstart", reset);
    reset();
    return () => {
      window.removeEventListener("mousemove", reset);
      window.removeEventListener("touchstart", reset);
    };
  }, []);

  // ✅ TEACHER LIST
  const teacherList = useMemo(() => {
    if (!timetableData) return [];
    return Array.from(new Set(
      Object.values(timetableData.schedule?.[currentDay]?.classes || []).flatMap(slot =>
        Object.values(slot.subjects || {}).flatMap(school =>
          Object.values(school || {}).flatMap(entry =>
            entry.teacher ? entry.teacher.split("/") : []
          )
        )
      )
    ));
  }, [timetableData, currentDay]);

  // ✅ TEACHER ROUTINE
  useEffect(() => {
    if (!selectedTeacher || !timetableData) return;

    const today = timetableData.schedule?.[currentDay]?.classes || [];

    const result = today.flatMap(slot => {
      return classes.flatMap(c => {
        let arr = [];
        const vh = slot.subjects?.["Vincent Hill"]?.[c];
        const sh = slot.subjects?.["Shangri-la"]?.[c];

        if (vh?.teacher?.includes(selectedTeacher))
          arr.push({ time: slot.time, class: `${c} VH`, subject: vh.subject });

        if (sh?.teacher?.includes(selectedTeacher))
          arr.push({ time: slot.time, class: `${c} SH`, subject: sh.subject });

        return arr;
      });
    });

    setTeacherSchedule(result);
  }, [selectedTeacher, timetableData, currentDay]);

  return (
    <div className={`timetable-container ${isIdle ? "screensaver" : ""}`}>

      {/* 🔊 BELL AUDIO */}
      <audio ref={bellRef} src="/sounds/bell.mp3" preload="auto" />

      <h1>📅 School Timetable</h1>
      <h2>{currentDay} | {currentTime}</h2>

      {currentSlot && <h3>📚 {currentSlot.time}</h3>}
      {nextSlot && <h4>⏭ Next: {nextSlot.time}</h4>}

      {/* TABLE */}
      {currentSlot ? (
        <table className="timetable">
          <thead>
            <tr>
              <th>Class</th>
              <th>Vincent Hill</th>
              <th>Shangri-la</th>
            </tr>
          </thead>
          <tbody>
            {classes.map((c,i) => {

              if (currentSlot.break || currentSlot.isCommonRoutine) {
                return i === 0 ? (
                  <tr key={i}>
                    <td colSpan={3}>{currentSlot.break || "Activity"}</td>
                  </tr>
                ) : null;
              }

              const vh = currentSlot.subjects?.["Vincent Hill"]?.[c] || {};
              const sh = currentSlot.subjects?.["Shangri-la"]?.[c] || {};

              return (
                <tr key={i}>
                  <td>{c}</td>
                  <td>{vh.subject ? `${vh.subject} (${vh.teacher})` : "-"}</td>
                  <td>{sh.subject ? `${sh.subject} (${sh.teacher})` : "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : <p>No active class</p>}

      {/* 👨‍🏫 TEACHER SELECT */}
      {!isIdle && (
        <>
          <h3>Select Teacher</h3>
          <select value={selectedTeacher} onChange={(e)=>setSelectedTeacher(e.target.value)}>
            <option value="">Select Teacher</option>
            {teacherList.map(t => <option key={t}>{t}</option>)}
          </select>

          {/* ROUTINE */}
          {teacherSchedule.length > 0 && (
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Class</th>
                  <th>Subject</th>
                </tr>
              </thead>
              <tbody>
                {teacherSchedule.map((e,i)=>(
                  <tr key={i}>
                    <td>{e.time}</td>
                    <td>{e.class}</td>
                    <td>{e.subject}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

    </div>
  );
};

export default TimetableTable;
