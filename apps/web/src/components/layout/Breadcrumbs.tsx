import { useLocation, Link } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Home } from "lucide-react";
import { Fragment } from "react";

export function Breadcrumbs() {
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);

  const breadcrumbItems = pathSegments.map((segment, index) => {
    const path = '/' + pathSegments.slice(0, index + 1).join('/');
    const isLast = index === pathSegments.length - 1;
    
    // Format the segment for display
    const label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');

    return { path, label, isLast };
  });

  let homeItem = null;
  if (pathSegments.length === 0) {
    homeItem = (
      <BreadcrumbPage className="flex items-center gap-1.5">
        <Home className="h-3.5 w-3.5" />
        <span>Inboxes</span>
      </BreadcrumbPage>
    );
  } else {
    homeItem = (
      <BreadcrumbLink asChild>
        <Link to="/" className="flex items-center gap-1.5">
          <Home className="h-3.5 w-3.5" />
          <span>Inboxes</span>
        </Link>
      </BreadcrumbLink>
    );
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          {homeItem}
        </BreadcrumbItem>

        {breadcrumbItems.map((item) => {
          let itemContent = null;
          if (item.isLast) {
            itemContent = <BreadcrumbPage>{item.label}</BreadcrumbPage>;
          } else {
            itemContent = (
              <BreadcrumbLink asChild>
                <Link to={item.path}>{item.label}</Link>
              </BreadcrumbLink>
            );
          }
          return (
            <Fragment key={item.path}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {itemContent}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
