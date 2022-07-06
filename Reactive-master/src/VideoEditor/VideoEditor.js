/* eslint-disable func-names */
import { useState, useEffect } from "react";
import "../editor.css";
import Editor from "./Editor";
import VideoUrlDummy from "./dummy.mp4";

function VideoEditor() {
  const [videoUrl, setVideoUrl] = useState("");

  //Stateful array handling storage of the start and end times of videos
  const [timings, setTimings] = useState([]);
  useEffect(() => {
    console.log(timings);
  }, []);
  return (
    // videoUrl --> URL of uploaded video

    <Editor
      videoUrl={VideoUrlDummy}
      setVideoUrl={setVideoUrl}
      timings={timings}
      setTimings={setTimings}
    />
  );
}

export default VideoEditor;
