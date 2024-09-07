// import './App.css';
// import React from "react";
import { useState, useRef, useEffect } from "react";
import { nanoid } from "nanoid";
import Form from "./components/Form";
import FilterButton from "./components/FilterButton";
import Todo from "./components/Todo";
import { usePrevious } from "./myreact";

const FILTER_MAP = {
  All: () => true,
  Active: (task) => !task.completed,
  Completed: (task) => task.completed,
};
const FILTER_NAMES = Object.keys(FILTER_MAP);

// コンポーネント関数はアッパーキャメルケース
// props は読み取り専用，HTMLの属性のように渡し、JSの関数の引数のように受け取る
function Hello(props) {
  return (  // この括弧 () は JS の文法の括弧
    // 特別な構文 <> があります。これはフラグメントです。
    // React コンポーネントは単一の JSX 要素を返す必要がありますが、
    // フラグメントを使用することで、ブラウザーに任意の <div> をレンダリングせずにそれを行うことができます。
    <>
      <header>
        {/* JSX で中括弧の中に何か有効な JavaScript の式を書くことができます。 */}
        {/* コメントも JavaScript の式です。 */}
        {// コメントも JavaScript の式です。
        }
        <h1>Hello, {props.subject}!</h1>
        <button type="button" className="primary"> {/* class は JavaScript の予約語と競合するため JSX では className となっている */}
          Click me!
        </button>
      </header>
    </>
  );
}

function App(props) {
  // フック
  const [tasks, setTasks] = useState(props.tasks);
  const [filter, setFilter] = useState("All");
  const listHeadingRef = useRef(null);
  const prevTaskLength = usePrevious(tasks.length);

  const taskList = tasks
    .filter(FILTER_MAP[filter])
    .map((task) => (
      <Todo
        id={task.id}
        name={task.name}
        completed={task.completed}
        key={task.id /* React で管理されている特別な prop
          反復処理でレンダリングするものには、常に固有なキーを渡す必要があります。 */}
        toggleTaskCompleted={toggleTaskCompleted}
        deleteTask={deleteTask}
        editTask={editTask}
      />
    ));

  const filterList = FILTER_NAMES.map((name) => (
    <FilterButton
      key={name}
      name={name}
      isPressed={name === filter}
      setFilter={setFilter}
    />
  ));

  const tasksNoun = taskList.length !== 1 ? "tasks" : "task";
  const headingText = `${taskList.length} ${tasksNoun} remaining`;

  // コールバックプロパティ
  // 完了状態をブラウザと同期する
  function toggleTaskCompleted(id) {
    const updatedTasks = tasks.map((task) => {
      // if this task has the same ID as the edited task
      if (id === task.id) {
        // use object spread to make a new object
        // whose `completed` prop has been inverted
        return { ...task, completed: !task.completed }; // 全部コピー(シャローコピー)してcompletedだけ上書き
      }
      return task;
    });
    setTasks(updatedTasks);
  }

  // コールバックプロパティ
  // タスクの削除
  function deleteTask(id) {
    const remainingTasks = tasks.filter((task) => id !== task.id);
    setTasks(remainingTasks);
  }

  // コールバックプロパティ
  // タスク名の編集
  function editTask(id, newName) {
    const editedTaskList = tasks.map((task) => {
      // if this task has the same ID as the edited task
      if (id === task.id) {
        // Copy the task and update its name
        return { ...task, name: newName };
      }
      // Return the original task if it's not the edited task
      return task;
    });
    setTasks(editedTaskList);
  }

  // コールバックプロパティ
  // propを使用して子から親にデータを渡すことはできません。
  // 代わりに、いくつかのデータを受け取る関数を親に記述し、その関数を子にプロパティとして渡すことができます。
  function addTask(name) {
    const newTask = { id: `todo-${nanoid()}`, name, completed: false };
    setTasks([...tasks, newTask]);
  }

  // タスクの数が変わったときに実行する
  useEffect(() => {
    if (tasks.length < prevTaskLength) {
      listHeadingRef.current.focus();
    }
  }, [tasks.length, prevTaskLength]);

  return (
    <div className="todoapp stack-large">
      <h1>TodoMatic</h1>
      <Form addTask={addTask} /> {/* コールバックプロパティ */}
      <div className="filters btn-group stack-exception">
        {filterList}
      </div>
      <h2 id="list-heading" tabIndex="-1" ref={listHeadingRef}>
        {headingText}
      </h2>
      <ul
        role="list"
        className="todo-list stack-large stack-exception"
        aria-labelledby="list-heading">
        {taskList}
      </ul>
    </div>
  );
}

export default App;
