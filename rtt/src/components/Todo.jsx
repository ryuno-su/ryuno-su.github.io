import { useEffect, useRef, useState } from "react";
import { usePrevious } from "../myreact";

function Todo(props) {
  // フック
  const [isEditing, setEditing] = useState(false);
  const [newName, setNewName] = useState("");
  // 要素をターゲットにする
  // useRef(): currentという単一のプロパティを持つオブジェクトを作成します。
  // Ref には任意の値を保存でき、後でそれらの値を参照できます。DOM 要素への参照を保存することもできます。
  // フォーカス管理に使う
  const editFieldRef = useRef(null);  // edit
  const editButtonRef = useRef(null);  // view
  const wasEditing = usePrevious(isEditing);  // isEditingの以前の値を追跡する

  const editingTemplate = (
    <form className="stack-small" onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="todo-label" htmlFor={props.id}>
          New name for {props.name}
        </label>
        <input
          id={props.id}
          className="todo-text"
          type="text"
          value={newName}
          onChange={handleChange}
          ref={editFieldRef}
        />
      </div>
      <div className="btn-group">
        <button
          type="button"
          className="btn todo-cancel"
          onClick={() => setEditing(false)}>
          Cancel
          <span className="visually-hidden">renaming {props.name}</span>
        </button>
        <button type="submit" className="btn btn__primary todo-edit">
          Save
          <span className="visually-hidden">new name for {props.name}</span>
        </button>
      </div>
    </form>
  );

  const viewTemplate = (
    <div className="stack-small">
      <div className="c-cb">
        <input
          id={props.id}
          type="checkbox"
          defaultChecked={props.completed}
          onChange={() => props.toggleTaskCompleted(props.id)}
        />
        <label className="todo-label" htmlFor={props.id}>
          {props.name}
        </label>
      </div>
      <div className="btn-group">
        <button
          type="button"
          className="btn"
          onClick={() => setEditing(true)}
          ref={editButtonRef}>
          Edit <span className="visually-hidden">{props.name}</span>
        </button>
        <button
          type="button"
          className="btn btn__danger"
          onClick={() => props.deleteTask(props.id)}>
          Delete <span className="visually-hidden">{props.name}</span>
        </button>
      </div>
    </div>
  );

  function handleChange(event) {
    setNewName(event.target.value);
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!newName) {
      alert("input task's name, length > 0");
    } else {
      props.editTask(props.id, newName);
      setNewName("");
      setEditing(false);
    }
  }

  // コンポーネントがレンダリングされた後にuseEffect()内部のコードが実行される
  // (return; の直後ってこと？)
  // useEffect()は関数を引数として受け取ります。2番目の引数として配列(依存する値のリスト)を受け取ります。
  // useEffect()は第二引数の配列の値の1つが変更された場合にのみ第一引数の関数が実行されます。
  // edit -> view または view -> edit の変化が起きた時に実行する
  useEffect(() => {
    if (!wasEditing && isEditing) {
      editFieldRef.current.focus();
    } else if (wasEditing && !isEditing) {
      editButtonRef.current.focus();
    }
  }, [wasEditing, isEditing]);

  return <li className="todo">{isEditing ? editingTemplate : viewTemplate}</li>;
}

export default Todo;
