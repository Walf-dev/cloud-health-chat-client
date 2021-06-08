import { memo, useState, useEffect, useRef, useCallback } from "react";
import { CancelRounded, CheckCircleRounded } from "@material-ui/icons";
import ClickAwayListener from "@material-ui/core/ClickAwayListener";
import { IconButton } from "@material-ui/core";
import { ReactComponent as Send } from "./icon/send.svg";
import { ReactComponent as VoiceRec } from "./icon/voice-rec-footer.svg";
import { ReactComponent as Document } from "./icon/document.svg";
import { ReactComponent as HealthRec } from "./icon/health-rec.svg";
import { ReactComponent as Performance } from "./icon/performance.svg";
import { ReactComponent as Campic } from "./icon/camera-pic.svg";
import { ReactComponent as PaperClip } from "./icon/paper-clip.svg";
import { AddPhotoAlternate } from "@material-ui/icons";
import emoji from "./icon/emoji.png";
import speaker from "./icon/speaker.png";
import MovieIcon from "@material-ui/icons/Movie";
import Tooltip from "@material-ui/core/Tooltip";
import db, { createTimestamp, fieldIncrement, audioStorage } from "./firebase";
import { useStateValue } from "./StateProvider";
import { CSSTransition } from "react-transition-group";
import recorder from "./recorder.js";
import { v4 as uuidv4 } from "uuid";
import "./ChatFooter.css";
import "./attachment-button.css";
import "emoji-mart/css/emoji-mart.css";
import { Picker } from "emoji-mart";
import { useSpeechRecognition, useSpeechSynthesis } from "react-speech-kit";

const wait = (time) => new Promise((resolve) => setTimeout(resolve, time));

export default memo(function ChatFooter({
  input,
  handleFocus,
  change,
  setInput,
  sendMessage,
  setFocus,
  image,
  video,
  file,
  focus,
  state,
  token,
  roomID,
  setAudioID,
  handleImg,
  handleVideo,
  handleFile,
}) {
  const [recording, setRecording] = useState(false);
  const [recordingTimer, setRecordingTimer] = useState("00:00");
  const [{ user }] = useStateValue();
  const recordingEl = useRef();
  const inputRef = useRef();
  const timerInterval = useRef();
  const record = useRef();
  const [emojiPickerState, SetEmojiPicker] = useState(false);
  const [message, SetMessage] = useState("");
  const [open, setOpen] = useState(false);

  let emojiPicker;
  if (emojiPickerState) {
    emojiPicker = (
      <Picker
        title="Pick your emoji…"
        emoji="point_up"
        onSelect={(emoji) => setInput(input + emoji.native)}
      />
    );
  }

  function triggerPicker(event) {
    event.preventDefault();
    SetEmojiPicker(!emojiPickerState);
  }

  const { listen, listening, stop } = useSpeechRecognition({
    onResult: (result) => {
      setInput(result);
    },
  });

  function handleBlur(event) {
    if (!event.currentTarget.contains(event.relatedTarget) && !recording) {
      setFocus(false);
    }
  }

  async function sendAudio(audioFile, timer, audioName) {
    db.collection("rooms")
      .doc(roomID)
      .set(
        {
          [user.uid]: false,
        },
        { merge: true }
      );
    db.collection("rooms")
      .doc(roomID)
      .set(
        {
          lastMessage: {
            audio: true,
            time: timer,
          },
          seen: false,
        },
        { merge: true }
      );
    if (state.userID) {
      db.collection("users")
        .doc(state.userID)
        .collection("chats")
        .doc(roomID)
        .set(
          {
            timestamp: createTimestamp(),
            photoURL: user.photoURL ? user.photoURL : null,
            name: user.displayName,
            userID: user.uid,
            unreadMessages: fieldIncrement(1),
          },
          { merge: true }
        );
      db.collection("users")
        .doc(user.uid)
        .collection("chats")
        .doc(roomID)
        .set(
          {
            timestamp: createTimestamp(),
            photoURL: state.photoURL ? state.photoURL : null,
            name: state.name,
            userID: state.userID,
          },
          { merge: true }
        );
    } else {
      db.collection("users")
        .doc(user.uid)
        .collection("chats")
        .doc(roomID)
        .set({
          timestamp: createTimestamp(),
          photoURL: state.photoURL ? state.photoURL : null,
          name: state.name,
        });
    }
    const doc = await db
      .collection("rooms")
      .doc(roomID)
      .collection("messages")
      .add({
        name: user.displayName,
        uid: user.uid,
        timestamp: createTimestamp(),
        time: new Date().toUTCString(),
        audioUrl: "uploading",
        audioName,
        audioPlayed: false,
      });
    await audioStorage.child(audioName).put(audioFile);
    const url = await audioStorage.child(audioName).getDownloadURL();
    db.collection("rooms")
      .doc(roomID)
      .collection("messages")
      .doc(doc.id)
      .update({
        audioUrl: url,
      });
    if (state.userID && token !== "") {
      db.collection("notifications").add({
        userID: user.uid,
        title: user.displayName,
        body: "🎵 " + timer,
        photoURL: user.photoURL,
        token: token,
      });
    }
  }

  async function startRecording(e) {
    e.preventDefault();
    if (window.navigator.onLine) {
      if (focus) {
        inputRef.current.focus();
      }
      await wait(150);
      record.current = await recorder(roomID);
      setAudioID(null);
      inputRef.current.style.width = "calc(100% - 56px)";
      await wait(305);
      setRecording(true);
    } else {
      alert("No internet access 🚫📶");
    }
  }

  async function stopRecording() {
    if (focus) {
      inputRef.current.focus();
    }
    db.collection("rooms")
      .doc(roomID)
      .set(
        {
          [user.uid]: false,
        },
        { merge: true }
      );
    clearInterval(timerInterval.current);
    const stopped = record.current.stop();
    recordingEl.current.style.opacity = "0";
    await wait(300);
    setRecording(false);
    inputRef.current.style.width = "calc(100% - 112px)";
    const time = recordingTimer;
    setRecordingTimer("00:00");
    return [stopped, time];
  }

  async function finishRecording() {
    var [audio, time] = await stopRecording();
    audio = await audio;
    sendAudio(audio.audioFile, time, audio.audioName);
  }

  function pad(val) {
    var valString = val + "";
    if (valString.length < 2) {
      return "0" + valString;
    } else {
      return valString;
    }
  }

  function timer() {
    const start = Date.now();
    timerInterval.current = setInterval(setTime, 100);

    function setTime() {
      const delta = Date.now() - start; // milliseconds elapsed since start
      const totalSeconds = Math.floor(delta / 1000);
      setRecordingTimer(
        pad(parseInt(totalSeconds / 60)) + ":" + pad(totalSeconds % 60)
      );
    }
  }

  function audioInputChange(e) {
    if (window.navigator.onLine) {
      const file = e.target.files[0];
      if (file) {
        setAudioID(null);
        const audioFile = new Audio(URL.createObjectURL(file));
        audioFile.addEventListener("loadedmetadata", () => {
          const totalSeconds = Math.floor(audioFile.duration);
          const time =
            pad(parseInt(totalSeconds / 60)) + ":" + pad(totalSeconds % 60);
          sendAudio(file, time, uuidv4());
        });
      }
    } else {
      alert("No internet access 🚫📶");
    }
  }

  useEffect(() => {
    const a = async () => {
      await wait(10);
      recordingEl.current.style.opacity = "1";
      await wait(100);
      timer();
      db.collection("rooms")
        .doc(roomID)
        .set(
          {
            [user.uid]: "recording",
          },
          { merge: true }
        );
      record.current.start();
    };
    if (recording) {
      a();
    }
  }, [recording]);

  const btnIcons = (
    <>
      <CSSTransition
        in={input !== "" || (input === "" && image) || (input === "" && video)}
        timeout={{
          enter: 400,
          exit: 200,
        }}
        classNames="send__animate2"
        className="send__icon"
      >
        <Send
          style={{
            width: 27,
            height: 27,
          }}
        />
      </CSSTransition>
      <CSSTransition
        in={
          !(input !== "" || (input === "" && image) || (input === "" && video))
        }
        timeout={{
          enter: 400,
          exit: 200,
        }}
        classNames="send__animate"
        className="send__icon"
      >
        <VoiceRec
          style={{
            width: 27,
            height: 27,
          }}
        />
      </CSSTransition>
    </>
  );

  const closeHandler = useCallback(() => setOpen(false), []);

  return (
    <ClickAwayListener onClickAway={closeHandler}>
      <div className="input">
        {emojiPicker}
        <div className="chat__footer" onBlur={handleBlur}>
          <form>
            <div className="form__icons-input-and-camera">
              <div className="fabs">
                <div
                  className="fab white"
                  tooltip="Speak To Write"
                  onMouseDown={listen}
                  onMouseUp={stop}
                >
                  <img src={speaker} alt="Speaker" className="svg" />
                </div>
                <div className="fab white" tooltip="Health Records">
                  <HealthRec className="svg" />
                </div>
                <div className="fab white" tooltip="Performance">
                  <Performance className="svg" />
                </div>
                <div className="fab white" tooltip="Camera">
                  <input
                    style={{ display: "none" }}
                    id="attach-media"
                    accept="image/*, video/*"
                    type="file"
                    capture="user"
                  />
                  <IconButton>
                    <label
                      style={{ color: "black", cursor: "pointer", height: 24 }}
                      htmlFor="attach-media"
                    >
                      <Campic className="cam-pic" />
                    </label>
                  </IconButton>
                </div>
                <div className="fab white" tooltip="Documents">
                  <input
                    id="attach-file"
                    style={{ display: "none" }}
                    accept="doc/*, docx/*, pdf/*, xls/*, xlsx/*, ppt/*, txt/*"
                    type="file"
                    onChange={handleFile}
                  />
                  <IconButton className="img-icon">
                    <label
                      style={{ color: "black", cursor: "pointer", height: 24 }}
                      htmlFor="attach-file"
                    >
                      <Document className="doc" />
                    </label>
                  </IconButton>
                </div>
                <div className="fab white" tooltip="Photo">
                  <input
                    id="attach-image"
                    style={{ display: "none" }}
                    accept="image/*"
                    type="file"
                    onChange={handleImg}
                  />
                  <IconButton className="img-icon">
                    <label
                      style={{ color: "black", cursor: "pointer", height: 24 }}
                      htmlFor="attach-image"
                    >
                      <AddPhotoAlternate />
                    </label>
                  </IconButton>
                </div>
                <div className="fab white" tooltip="Video">
                  <input
                    id="attach-video"
                    style={{ display: "none" }}
                    accept="video/*"
                    type="file"
                    onChange={handleVideo}
                  />
                  <IconButton className="img-icon">
                    <label
                      style={{ color: "black", cursor: "pointer", height: 24 }}
                      htmlFor="attach-video"
                    >
                      <MovieIcon />
                    </label>
                  </IconButton>
                </div>
                <div id="paper-clip" tooltip="Attach">
                  <PaperClip className="paper-clip" />
                </div>
              </div>

              <div className="emoji-box">
                <IconButton title="Add Emoji">
                  <span
                    role="img"
                    aria-label="emoji picker button"
                    onClick={triggerPicker}
                  >
                    <img src={emoji} alt="Emoji" className="emoji-icon" />
                  </span>
                </IconButton>
              </div>
              <div className="form__input-and-camera">
                <input
                  ref={inputRef}
                  value={input}
                  onClick={handleFocus}
                  onChange={!recording ? change : null}
                  onKeyPress={recording ? () => false : null}
                  onFocus={() => setFocus(true)}
                  placeholder="Type Your Message"
                  className="input"
                />
                <div className="camera">
                  <input
                    style={{ display: "none" }}
                    id="attach-media"
                    accept="image/*, video/*"
                    type="file"
                    capture="user"
                  />
                  <IconButton title="Take photos & videos">
                    <label style={{ cursor: "pointer" }} htmlFor="attach-media">
                      <Campic />
                    </label>
                  </IconButton>
                </div>
              </div>
            </div>

            <div>
              {navigator.mediaDevices.getUserMedia && window.MediaRecorder ? (
                <button
                  type="submit"
                  className="send__btn"
                  onClick={
                    input !== "" ||
                    (input === "" && image) ||
                    (input === "" && video) ||
                    (input === "" && file)
                      ? sendMessage
                      : startRecording
                  }
                >
                  {btnIcons}
                </button>
              ) : (
                <>
                  <label for="capture" className="send__btn">
                    {btnIcons}
                  </label>
                  <input
                    style={{ display: "none" }}
                    type="file"
                    id="capture"
                    accept="audio/*"
                    capture
                    onChange={audioInputChange}
                  />
                </>
              )}
            </div>
          </form>
          {recording ? (
            <div ref={recordingEl} className="record">
              <CancelRounded
                style={{
                  width: 30,
                  height: 30,
                  color: "#F20519",
                }}
                onClick={stopRecording}
              />
              <div>
                <div className="record__redcircle"></div>
                <div className="record__duration">{recordingTimer}</div>
              </div>
              <CheckCircleRounded
                style={{
                  width: 30,
                  height: 30,
                  color: "#41BF49",
                }}
                onClick={finishRecording}
              />
            </div>
          ) : null}
        </div>
      </div>
    </ClickAwayListener>
  );
});
