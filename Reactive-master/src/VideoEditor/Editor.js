// /* eslint-disable func-names */
import { useState, useRef, useEffect } from "react";
import "../editor.css";
import { createFFmpeg } from "@ffmpeg/ffmpeg"; // https://github.com/ffmpegwasm/ffmpeg.wasm/blob/master/docs/api.md

function Editor({ videoUrl, timings, setTimings }) {
  //Float integer state to help with trimming duration logic
  const [difference, setDifference] = useState(0.2);

  //Boolean state to handle deleting grabber functionality
  const [deletingGrabber, setDeletingGrabber] = useState(false);

  //State for error handling
  const [currentWarning, setCurrentWarning] = useState(null);

  //Integer state to blue progress bar as video plays
  const [seekerBar, setSeekerBar] = useState(0);

  //Ref handling metadata needed for trim markers
  const currentlyGrabbedRef = useRef({ index: 0, type: "none" });

  //Ref handling the initial video element for trimming
  const playVideoRef = useRef();

  //Ref handling the progress bar element
  const progressBarRef = useRef();

  //Ref handling the element of the current play time
  const playBackBarRef = useRef();

  //Variable for error handling on the delete grabber functionality
  const warnings = {
    delete_grabber: (
      <div>Please click on the grabber (either start or end) to delete it</div>
    ),
  };

  //Boolean state handling whether ffmpeg has loaded or not
  const [ready, setReady] = useState(false);

  //Ref to handle the current instance of ffmpeg when loaded
  const ffmpeg = useRef(null);

  //Function handling loading in ffmpeg
  const load = async () => {
    try {
      await ffmpeg.current.load();

      setReady(true);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    console.log(timings);
  }, [timings]);

  //Loading in ffmpeg when this component renders
  useEffect(() => {
    console.log(timings);
    ffmpeg.current = createFFmpeg({
      log: true,
      corePath: "https://unpkg.com/@ffmpeg/core@0.10.0/dist/ffmpeg-core.js",
    });
    console.log(timings);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  //Lifecycle handling the logic needed for the progress bar - displays the blue bar that grows as the video plays
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    console.log(timings);
    if (playVideoRef.current.onloadedmetadata) {
      const currentIndex = currentlyGrabbedRef.current.index;
      const seek =
        ((playVideoRef.current.currentTime - timings[0].start) /
          playVideoRef.current.duration) *
        100;
      setSeekerBar(seek);
      progressBarRef.current.style.width = `${seekerBar}%`;
      if (playVideoRef.current.currentTime >= timings[0].end) {
        playVideoRef.current.pause();

        currentlyGrabbedRef.current = {
          index: currentIndex + 1,
          type: "start",
        };
        progressBarRef.current.style.width = "0%";
        progressBarRef.current.style.left = `${
          (timings[0].start / playVideoRef.current.duration) * 100
        }%`;
        playVideoRef.current.currentTime = timings[0].start;
      }
    }

    //여기가 문제인듯 하다
    //Handles the start and end metadata for the timings state
    const time = timings;
    playVideoRef.current.onloadedmetadata = () => {
      if (time.length === 0) {
        time.push({ start: 0, end: playVideoRef.current.duration });

        setTimings(time);
        addActiveSegments();
      } else {
        addActiveSegments();
      }
    };
  });

  //Lifecycle that handles removing event listener from the mouse event on trimmer - Desktop browser
  useEffect(() => {
    console.log(timings);
    return window.removeEventListener("mouseup", removeMouseMoveEventListener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  //Lifecycle that handles removing event listener from the touch/pointer event on trimmer - mobile browser
  useEffect(() => {
    return window.removeEventListener(
      "pointerup",
      removePointerMoveEventListener
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  //Function handling the trimmer movement logic
  const handleMouseMoveWhenGrabbed = (event) => {
    playVideoRef.current.pause();
    addActiveSegments();
    let playbackRect = playBackBarRef.current.getBoundingClientRect();
    let seekRatio = (event.clientX - playbackRect.left) / playbackRect.width;
    const index = currentlyGrabbedRef.current.index;
    const type = currentlyGrabbedRef.current.type;
    let time = timings;
    let seek = playVideoRef.current.duration * seekRatio;
    if (
      type === "start" &&
      seek > (index !== 0 ? time[index - 1].end + difference + 0.2 : 0) &&
      seek < time[index].end - difference
    ) {
      progressBarRef.current.style.left = `${seekRatio * 100}%`;
      playVideoRef.current.currentTime = seek;
      time[index]["start"] = seek;

      setTimings(time);
    } else if (
      type === "end" &&
      seek > time[index].start + difference &&
      seek <
        (index !== timings.length - 1
          ? time[index].start - difference - 0.2
          : playVideoRef.current.duration)
    ) {
      progressBarRef.current.style.left = `${
        (time[index].start / playVideoRef.current.duration) * 100
      }%`;
      playVideoRef.current.currentTime = time[index].start;
      time[index]["end"] = seek;

      setTimings(time);
    }
    progressBarRef.current.style.width = "0%";
  };

  //Function that handles removing event listener from the mouse event on trimmer - Desktop browser
  const removeMouseMoveEventListener = () => {
    window.removeEventListener("mousemove", handleMouseMoveWhenGrabbed);
  };

  //Lifecycle that handles removing event listener from the mouse event on trimmer - Mobile browser
  const removePointerMoveEventListener = () => {
    window.removeEventListener("pointermove", handleMouseMoveWhenGrabbed);
  };

  //Function handling skip to previous logic

  //Function handling updating progress logic (clicking on progress bar to jump to different time durations)
  const updateProgress = (event) => {
    let playbackRect = playBackBarRef.current.getBoundingClientRect();
    let seekTime =
      ((event.clientX - playbackRect.left) / playbackRect.width) *
      playVideoRef.current.duration;
    playVideoRef.current.pause();
    // find where seekTime is in the segment
    let index = -1;
    let counter = 0;
    for (let times of timings) {
      if (seekTime >= times.start && seekTime <= times.end) {
        index = counter;
      }
      counter += 1;
    }
    if (index === -1) {
      return;
    }

    currentlyGrabbedRef.current = { index: index, type: "start" };
    progressBarRef.current.style.width = "0%"; // Since the width is set later, this is necessary to hide weird UI
    progressBarRef.current.style.left = `${
      (timings[index].start / playVideoRef.current.duration) * 100
    }%`;
    playVideoRef.current.currentTime = seekTime;
  };

  //Function handling deletion of trimmers logic
  const deleteGrabber = (index) => {
    let time = timings;
    setDeletingGrabber({
      deletingGrabber: false,
      currentWarning: null,
      currentlyGrabbed: { index: 0, type: "start" },
    });
    setDeletingGrabber({
      deletingGrabber: false,
      currentWarning: null,
      currentlyGrabbed: { index: 0, type: "start" },
    });
    if (time.length === 1) {
      return;
    }
    time.splice(index, 1);
    progressBarRef.current.style.left = `${
      (time[0].start / playVideoRef.current.duration) * 100
    }%`;
    playVideoRef.current.currentTime = time[0].start;
    progressBarRef.current.style.width = "0%";
    addActiveSegments();
  };

  //Function handling logic of time segments throughout videos duration
  const addActiveSegments = () => {
    let colors = "";
    let counter = 0;
    colors += `, rgb(240, 240, 240) 0%, rgb(240, 240, 240) ${
      (timings[0].start / playVideoRef.current.duration) * 100
    }%`;
    for (let times of timings) {
      if (counter > 0) {
        colors += `, rgb(240, 240, 240) ${
          (timings[counter].end / playVideoRef.current.duration) * 100
        }%, rgb(240, 240, 240) ${
          (times.start / playVideoRef.current.duration) * 100
        }%`;
      }
      colors += `, #ccc ${
        (times.start / playVideoRef.current.duration) * 100
      }%, #ccc ${(times.end / playVideoRef.current.duration) * 100}%`;
      counter += 1;
    }
    colors += `, rgb(240, 240, 240) ${
      (timings[counter - 1].end / playVideoRef.current.duration) * 100
    }%, rgb(240, 240, 240) 100%`;
    playBackBarRef.current.style.background = `linear-gradient(to right${colors})`;
  };

  // Function handling logic for post trimmed video
  const saveVideo = () => {
    let metadata = {
      trim_times: timings,
    };
    console.log(metadata.trim_times);
    const trimStart = metadata.trim_times[0].start;
    const trimEnd = metadata.trim_times[0].end;

    const trimmedVideo = trimEnd - trimStart;

    //영상 시간 뽑는 부분
    console.log("Trimmed Duration: ", trimmedVideo);
    console.log("Trim start: ", trimStart);
    console.log("Trim End: ", trimEnd);
    console.log(timings);
  };
  console.log(playVideoRef.current);
  console.log(timings);
  return (
    <div className="wrapper">
      {/* Video element for the trimmed video */}

      {/* Main video element for the video editor */}
      <video
        className="video"
        autoload="metadata"
        ref={playVideoRef}
        onLoadedData={() => {
          console.log(timings);
          console.log(playVideoRef);
        }}
        onClick={() => {}}
        onTimeUpdate={() => {
          setSeekerBar(progressBarRef.current.style.width);
        }}
      >
        <source src={videoUrl} type="video/mp4" />
      </video>
      <div className="playback">
        {/* If there is an instance of the playVideoRef, render the trimmer markers */}
        {playVideoRef.current
          ? Array.from(timings).map((timing, index) => (
              <div key={index}>
                <div key={"grabber_" + index}>
                  {/* Markup and logic for the start trim marker */}
                  <div
                    id="grabberStart"
                    className="grabber start"
                    style={{
                      left: `${
                        (timings[0].start / playVideoRef.current.duration) * 100
                      }%`,
                    }}
                    // Events for desktop - Start marker
                    onMouseDown={(event) => {
                      if (deletingGrabber) {
                        deleteGrabber(index);
                      } else {
                        currentlyGrabbedRef.current = {
                          index: index,
                          type: "start",
                        };
                        window.addEventListener(
                          "mousemove",
                          handleMouseMoveWhenGrabbed
                        );
                        window.addEventListener(
                          "mouseup",
                          removeMouseMoveEventListener
                        );
                      }
                    }}
                    //Events for mobile - Start marker
                    onPointerDown={() => {
                      if (deletingGrabber) {
                        deleteGrabber(index);
                      } else {
                        currentlyGrabbedRef.current = {
                          index: index,
                          type: "start",
                        };
                        window.addEventListener(
                          "pointermove",
                          handleMouseMoveWhenGrabbed
                        );
                        window.addEventListener(
                          "pointerup",
                          removePointerMoveEventListener
                        );
                      }
                    }}
                  ></div>
                  {/* Markup and logic for the end trim marker */}
                  <div
                    id="grabberEnd"
                    className="grabber end"
                    style={{
                      left: `${
                        (timings[0].end / playVideoRef.current.duration) * 100
                      }%`,
                    }}
                    //Events for desktop - End marker
                    onMouseDown={(event) => {
                      if (deletingGrabber) {
                        deleteGrabber(index);
                      } else {
                        currentlyGrabbedRef.current = {
                          index: index,
                          type: "end",
                        };
                        window.addEventListener(
                          "mousemove",
                          handleMouseMoveWhenGrabbed
                        );
                        window.addEventListener(
                          "mouseup",
                          removeMouseMoveEventListener
                        );
                      }
                    }}
                    //Events for mobile - End marker
                    onPointerDown={() => {
                      if (deletingGrabber) {
                        deleteGrabber(index);
                      } else {
                        currentlyGrabbedRef.current = {
                          index: index,
                          type: "end",
                        };
                        window.addEventListener(
                          "pointermove",
                          handleMouseMoveWhenGrabbed
                        );
                        window.addEventListener(
                          "pointerup",
                          removePointerMoveEventListener
                        );
                      }
                    }}
                  ></div>
                </div>
              </div>
            ))
          : []}
        <div
          className="seekable"
          ref={playBackBarRef}
          onClick={updateProgress}
        ></div>
        <div className="progress" ref={progressBarRef}></div>
      </div>

      <div className="controls">
        <div>
          <button
            title="Save changes"
            className="trim-control"
            onClick={saveVideo}
          >
            Save
          </button>
        </div>
      </div>
      {ready ? <div></div> : <div>Loading...</div>}
      {currentWarning != null ? (
        <div className={"warning"}>{warnings[currentWarning]}</div>
      ) : (
        ""
      )}
    </div>
  );
}

export default Editor;
