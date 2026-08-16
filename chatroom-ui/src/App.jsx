import React from "react";
import {
  BrowserRouter as Router,
  Route,
  Switch,
  Redirect,
} from "react-router-dom";

import { Login } from "./Layout/Login";
import { ChatPage2 } from "./Layout/ChatPage2";

function App() {
  return (
    <Router>
      <Switch>

        {/* =========================
            HOME
        ========================= */}
        <Route exact path="/">
          <Redirect to="/login" />
        </Route>

        {/* =========================
            LOGIN PAGE
        ========================= */}
        <Route exact path="/login">
          <Login />
        </Route>

        {/* =========================
            CHAT PAGE
        ========================= */}
        <Route exact path="/chat">
          <ChatPage2 />
        </Route>

        {/* =========================
            INVALID URL
        ========================= */}
        <Route path="*">
          <Redirect to="/login" />
        </Route>

      </Switch>
    </Router>
  );
}

export default App;