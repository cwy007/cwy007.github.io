---
layout:     post
title:      "React: 使用 react-router-dom 实现页面跳转"
subtitle:   "react router"
date:       2020-07-11 17:53:00
author:     "chanweiyan"
header-style: text
catalog: true
tags:
  - React
---

## HashRouter

```jsx
import {HashRouter as Router} from 'react-router-dom';

ReactDOM.render(
  <Provider store={store}>
    <Router>
      <App />
    </Router>
  </Provider>,
  document.getElementById('root')
)

```


## Link

```jsx
{% raw %}
import { Link } from 'react-router-dom';

class Nav extends Component {
  render() {
    return (
      <ul style={{display: this.props.isLogin ? "block" : "none"}}>
        <li style={{display: this.props.isLogin ? "none" : "block"}}>
          <Link to="/">Login</Link>
        </li>
        <li>
          <Link to="/Home">Home</Link>
        </li>
        <li>
          <Link to="/About">About Us</Link>
        </li>
      </ul>
    );
  }
}
{% endraw %}
```

## Switch and Route

```jsx
import {
  Route,
  Switch
} from 'react-router-dom';

class App extends Component {
  render() {
    return (
      <div>
        <NavReactReducer /><br/><br/> {/* Nav */}

        {/* 点击导航中的链接，下面会显示对应的组件 */}
        <Switch>
          <Route exact path="/" component={LoginReactReducer} />
          <Route exact path="/Home" component={HomeReactReducer}/>
          <Route exact path="/About" component={AboutReactReducer} />
        </Switch>
      </div>
    );
  }
}
```

## Redirect

```jsx
import { Redirect } from 'react-router-dom';

  render() {
    if (this.props.isLogin === false) {
      return <Redirect to="/" />
    }

    return (
      <div>
        <div>
          <button onClick={this.userLogout}>Logout</button>
        </div>
        <div>
          <h3>Home</h3>
          <p>Hi, this is home page.</p>
        </div>
      </div>
    );
  }
```

## history.push("/Home")

this.props.history

```jsx
  // this.refs.username.value
  // this.props.history
  userLogin() {
    this.props.LOGIN(this.refs.username.value, this.refs.password.value, this.props.history);
  }

  // ref
  <div>
    Username: &nbsp;&nbsp;<input type="text" ref="username" />
  </div>
```

```jsx
function mapDispatchToProps(dispatch) {
  return {
    LOGOUT: function(history) {
      dispatch({type: UserMannType.LOG_OUT});
      history.push("/"); // 页面跳转
    }
  };
}
```

## 项目地址

https://github.com/cwy007/usermann
