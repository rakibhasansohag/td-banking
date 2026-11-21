declare interface HeaderBoxProps {
  type?: "title" | "greeting";
  title: string;
  subtext: string;
  user?: string;
}

declare type CategoryCount = {
  name: string;
  count: number;
  totalCount: number;
};

declare interface CategoryProps {
  category: CategoryCount;
}

declare interface CategoryBadgeProps {
  category: string;
}
