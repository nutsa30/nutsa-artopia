import { Link } from "react-router-dom";

export default function Breadcrumbs({ items = [] }) {
  return <nav aria-label="გვერდის მდებარეობა" className="site-breadcrumbs"><ol>
    {items.map((item, index) => <li key={`${item.item}-${index}`}>
      {index < items.length - 1 ? <Link to={item.item.replace("https://artopia.ge", "")}>{item.name}</Link>
        : <span aria-current="page">{item.name}</span>}
    </li>)}
  </ol></nav>;
}
