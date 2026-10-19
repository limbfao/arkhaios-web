'use client'
import { useContext, useEffect, useState } from "react";
import UserContext from "../UserContext";
import FriendsList from "./friendsList";
import ModifyFriends from "./modifyFriends";
import Messaging from "./messaging";

export default function Page() {


  const [websocket, setWebsocket] = useState();

  useEffect(() => {
    // Initialize the websocket connection here
    // Connect to whichever host served the page (arkhaios.io, localhost, ...)
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/message-handler`);
    setWebsocket(ws); // Store the websocket instance in state

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);



  
  return (
    <div className="flex p-10">
      <Messaging websocket={websocket}/>
      <ModifyFriends/>
    </div>
  );
}
