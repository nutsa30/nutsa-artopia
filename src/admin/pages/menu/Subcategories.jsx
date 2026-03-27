// AdminSubcategories.jsx
import React, { useEffect, useState } from "react";
import { getSubcategories, createSubcategory, updateSubcategory, deleteSubcategory } from "./api";

export default function AdminSubcategories() {
  const [category, setCategory] = useState("");
  const [subs, setSubs] = useState([]);
  const [name, setName] = useState("");

  const load = async () => {
    if (!category) { setSubs([]); return; }
    try { setSubs(await getSubcategories(category)); }
    catch { setSubs([]); }
  };
  useEffect(()=>{ load(); }, [category]);

  const add = async () => {
    if (!category || !name.trim()) return;
    await createSubcategory({ category, name: name.trim(), is_active: true });
    setName(""); load();
  };
  const toggle = async (s) => { await updateSubcategory(s.id, { is_active: !s.is_active }); load(); };
  const rename = async (s, newName) => { if (!newName.trim()) return; await updateSubcategory(s.id, { name: newName.trim() }); load(); };
  const remove = async (s) => { await deleteSubcategory(s.id); load(); };

  return (
    <div className="flex flex-col gap-3">
      <h3>ქვეკატეგორიები</h3>

      <label>
        კატეგორია
        <input value={category} onChange={(e)=>setCategory(e.target.value)} placeholder=" напр. სამხატვრო" />
      </label>

      <div className="flex gap-2">
        <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="ახალი ქვეკატეგორია" />
        <button onClick={add}>დამატება</button>
      </div>

      <ul className="divide-y">
        {subs.map(s=>(
          <li key={s.id} className="py-2 flex items-center gap-2">
            <input
              defaultValue={s.name}
              onBlur={(e)=>rename(s, e.currentTarget.value)}
              className="border px-2 py-1"
            />
            <button onClick={()=>toggle(s)}>{s.is_active ? "დეაქტივაცია" : "აქტივაცია"}</button>
            <button onClick={()=>remove(s)}>წაშლა</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
