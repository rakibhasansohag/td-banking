const Category = ({ category }: CategoryProps) => {
  const total = Math.max(category.totalCount, category.count, 1);
  const progress = Math.min(100, Math.round((category.count / total) * 100));

  return (
    <div className="category-summary">
      <div className="category-summary-label">
        <span>{category.name}</span>
        <span>{category.count}</span>
      </div>
      <div className="category-summary-track" aria-hidden="true">
        <span style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
};

export default Category;
