import React from "react";
import ReactDOM from "react-dom/client";
import { MusicLearningApp } from "../app/MusicLearningApp";
import "../app/globals.css";
import "../app/gate.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode><MusicLearningApp /></React.StrictMode>,
);
