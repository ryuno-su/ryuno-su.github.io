import { useState } from "react";

function Form(props) {
  // 状態によるデータの永続化と変更
  // props をコンポーネント間の通信方法と考えると、
  // 状態はコンポーネントに「メモリ」 (必要に応じて保持および更新できる情報) を与える方法と考えることができます。
  // name: 現在の値を持つ変数
  // setName: nameを変更する関数
  // useState: フックと呼ばれる特別なカテゴリの関数，name の初期値を受け取り，2つのものを配列で返す
  const [name, setName] = useState("");

  function handleChange(event) {
    setName(event.target.value);
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!name) {
      alert("input task's name, length > 0");
    } else {
      props.addTask(name);
      setName("");
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="label-wrapper">
        <label htmlFor="new-todo-input" className="label__lg">
          What needs to be done?
        </label>
      </h2>
      <input
        type="text"
        id="new-todo-input"
        className="input input__lg"
        name="text"
        autoComplete="off"
        value={name}
        onChange={handleChange /* onChange属性はJSXの予約語，onchangeはJSの予約語，他のon*も同様 */}
      />
      <button type="submit" className="btn btn__primary btn__lg">
        Add
      </button>
    </form>
  );
}

export default Form;
