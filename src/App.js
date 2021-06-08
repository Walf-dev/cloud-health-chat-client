import React, { useState, useEffect, memo, useRef } from "react";
import Sidebar from "./Sidebar";
import Chat from "./Chat";
import Login from "./Login";
import setOnlineStatus from "./setOnlineStatus";
import { Route, useLocation, Redirect } from "react-router-dom";
import { useStateValue } from "./StateProvider";
import CircularProgress from "@material-ui/core/CircularProgress";
import db, {
  loadFirebase,
  auth,
  provider,
  provider2,
  createTimestamp,
  messaging,
} from "./firebase";
import {
  TransitionGroup,
  Transition,
  CSSTransition,
} from "react-transition-group";
import "./App.css";
import useRoomsData from "./useRoomsData";
import scalePage from "./scalePage";

//notification configuration: Subscribes the messaging instance to push notifications.
//Returns an FCM registration token that can be used to send push messages to that messaging instance.
//If a notification permission isn't already granted, this method asks the user for permission.
//The returned promise rejects if the user does not allow the app to show notifications.
//if permission is granted, we save a token for this specific user
const configureNotif = (docID) => {
  messaging

    .requestPermission()
    .then(() => {
      //console.log('permission granted');
      return messaging.getToken();
    })
    .then((token) => {
      //console.log(token);
      db.collection("users").doc(docID).set(
        {
          token: token,
        },
        { merge: true }
      );
    })
    .catch((e) => {
      //console.log(e.message);
      db.collection("users").doc(docID).set(
        {
          token: "",
        },
        { merge: true }
      );
    });
  messaging.onMessage((payload) => {
    //console.log(payload.data);
  });
};

function App() {
  //initialize states
  const [{ user, path, pathID, roomsData, page }, dispatch, actionTypes] =
    useStateValue();
  const [loader, setLoader] = useState(true);
  const [pwaEvent, setPwaEvent] = useState(undefined);
  const [firebaseLoaded, setFirebaseLoaded] = useState(false);
  //initial state for version update
  const [updating, setUpdating] = useState(false);
  const [checkingVersion, setCheckingVersion] = useState(true);
  const [chats, setChats] = useState(null);
  const [chatsFetched, setChatsFetched] = useState();
  const location = useLocation();
  const [setRoomsData] = useRoomsData();
  const b = useRef([]);
  const menus = ["/rooms", "/search", "/users", "/chats"];

  useEffect(() => {
    function r() {
      //Adds an observer for changes to the user's sign-in state. The observer is only triggered on sign-in or sign-out.
      auth.onAuthStateChanged((authUser) => {
        //console.log("user change: ", authUser)
        //if user signed-in
        if (authUser) {
          //configure notif' if the current sign-in user's browser supports notif'
          if ("serviceWorker" in navigator && "PushManager" in window) {
            //console.log("This browser supports notifications and service workers")
            configureNotif(authUser.uid);
          } else {
            //console.log("This browser does not support notifications and service workers")
          }
          //console.log(authUser);
          //check the concordance between the version store in database and the version store in LocalStorage.
          //If they do not match, update the version in the LocalStorage and disconnect the user then, redirect to the login page. 
          db.collection("version")
            .doc("version")
            .get()
            .then((doc) => {
              const version = doc.data().version;
              const previousVersion = localStorage.getItem("version");
              if (previousVersion) {
                //console.log("previous version exists in local storage")
                if (version !== +previousVersion) {
                  //console.log("new version is not equal to previous version")
                  localStorage.setItem("version", version);
                  setUpdating(true);
                  auth.signOut();
                  auth
                    .signInWithRedirect(provider,provider2)
                    .catch((e) => alert(e.message));
                } else {
                  setCheckingVersion(false);
                }
              } else {
                //console.log("previous version doesn't exists in local storage")
                localStorage.setItem("version", version);
                setCheckingVersion(false);
              }
            })
            .then(() => {
              //console.log("checking version has finished");
              //update state with data of the current sign-in user 
              dispatch({ type: actionTypes.SET_USER, user: authUser });
              //update database with data of the current sign-in user
              const ref = db.collection("users").doc(authUser.uid);
              ref
                .get()
                .then((doc) => {
                  const data = doc.data();
                  if (data) {
                    if (data.timestamp) {
                      //console.log("updating user")
                      return ref.set(
                        {
                          name: authUser.displayName,
                          photoURL: authUser.photoURL,
                        },
                        { merge: true }
                      );
                    }
                  }
                  //console.log("setting user")
                  return ref.set(
                    {
                      name: authUser.displayName,
                      photoURL: authUser.photoURL,
                      timestamp: createTimestamp(),
                    },
                    { merge: true }
                  );
                })
                .then(() => (loader ? setLoader(false) : null));
            });
        } else {
          // if user has not logged-in update the state with no user
          dispatch({ type: actionTypes.SET_USER, user: null });
          //console.log(user);
          if (loader) setLoader(false);
          db.collection("version")
            .doc("version")
            .get()
            .then((doc) => {
              const version = doc.data().version;
              const previousVersion = localStorage.getItem("version");
              if (previousVersion) {
                //console.log("previous version exists in local storage")
                if (version !== +previousVersion) {
                  //console.log("new version is not equal to previous version")
                  localStorage.setItem("version", version);
                  if (user) {
                    auth
                      .signInWithRedirect(provider, provider2)
                      .catch((e) => alert(e.message));
                  } else {
                    setCheckingVersion(false);
                  }
                } else {
                  setCheckingVersion(false);
                }
              } else {
                //console.log("previous version doesn't exists in local storage")
                localStorage.setItem("version", version);
                setCheckingVersion(false);
              }
            });
        }//end non signed-in user
      });
    }
    //set firebase loaded to "true"
    loadFirebase(setFirebaseLoaded);
    if (firebaseLoaded) r();
  }, [user, firebaseLoaded]);

  useEffect(() => {
    //add event listener for Progressive Web App
    window.addEventListener("beforeinstallprompt", (e) => {
      // Prevent the mini-infobar from appearing on mobile
      //console.log("pwa event executed");
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setPwaEvent(e);
      // Update UI notify the user they can install the PWA
    });
    //add event listener for page resize
    window.addEventListener("resize", () => {
      dispatch({ type: "set_scale_page", page: scalePage() });
    });
  }, []);

  //get messages save in database or in cache (in case of internet disconnection) in every room for the current signed-in user 
  useEffect(() => {
    if (user && !checkingVersion) {
      /////in database
      db.collection("users")
        .doc(user.uid)
        .collection("chats")
        .orderBy("timestamp", "desc")
        .onSnapshot({ includeMetadataChanges: true }, (snap) => {
          if (snap.docs?.length > 0) {
            snap.docChanges().forEach((change) => {
              if (change.type === "added") {
                setRoomsData(change.doc.data().userID, change.doc.id);
              }
            });
            //if user is disconnected and we have cached messages display them
            if (
              !snap.metadata.fromCache ||
              (!window.navigator.onLine && snap.metadata.fromCache)
            ) {
              setChats(
                snap.docs.map((cur) => ({
                  ...cur.data(),
                  id: cur.id,
                }))
              );
            }
          } else {
            setChats([]);
          }
        });
    }
  }, [user, checkingVersion]);

  //if chats fetched, set them then, display them by desc
  useEffect(() => {
    if (chats?.length > 0) {
      if (chats.every((cur) => roomsData[cur.id]?.lastMessage)) {
        setChatsFetched(true);
      }
    } else if (chats?.length === 0) {
      setChatsFetched(true);
    }
  }, [chats, roomsData]);

  //set the user status (online or offline)
  useEffect(() => {
    var s;
    if (user && !checkingVersion) {
      setOnlineStatus(user.uid);
    }
    return () => {
      if (s) {
        s();
      }
    };
  }, [user, checkingVersion]);

  //chats location path name
  useEffect(() => {
    var id = location.pathname.replace("/room/", "");
    menus.forEach((cur) => (id = id.replace(cur, "")));
    dispatch({ type: "set_path_id", id });
  }, [location.pathname]);

  //our return statement
  return (
    <div className="app" style={{ ...page }}>
    {/*redirect to chats page on screen width smaller than 760*/}
      {page.width <= 760 ? <Redirect to="/chats" /> : <Redirect to="/" />}
      {/*display loader while checking for app's version*/}
      {(loader && chats === null) || checkingVersion ? (
        <div className="loader__container">
          <CircularProgress />
        </div>
        //if the version is verified, updated and the user is not logged-in redirect to Login page 
      ) : !user && !checkingVersion && !updating ? (
        <Login />
        //after Login and chats fetched display the whole app
      ) : !checkingVersion && !updating && chatsFetched ? (
        <div className="app__body">
          <Sidebar chats={chats} pwa={pwaEvent} />
          <TransitionGroup component={null}>
            {page.width <= 760 ? (
              <Transition
                key={location.pathname.replace("/image", "")}
                timeout={260}
              >
                {(state) => (
                  <Route location={location} path={`${path}/room/:roomID`}>
                    <Chat
                      b={b}
                      unreadMessages={
                        chats?.length > 0
                          ? chats.find((cur) => cur.id === pathID)
                              ?.unreadMessages
                          : 0
                      }
                      animState={state}
                    />
                  </Route>
                )}
              </Transition>
            ) : (
              <CSSTransition
                key={location.pathname.replace("/image", "")}
                timeout={1010}
                classNames="page"
              >
                {(state) => (
                  <Route location={location} path={`${path}/room/:roomID`}>
                    <Chat
                      b={b}
                      unreadMessages={
                        chats?.length > 0
                          ? chats.find((cur) => cur.id === pathID)
                              ?.unreadMessages
                          : 0
                      }
                      animState={state}
                    />
                  </Route>
                )}
              </CSSTransition>
            )}
          </TransitionGroup>
        </div>
      ) : (
        <div className="loader__container">
          <CircularProgress />
        </div>
      )}
    </div>
  );
}

export default memo(App);
