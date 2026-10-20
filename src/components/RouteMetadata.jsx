import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import SEO from "./SEO";
import { indexPolicy } from "../utils/indexPolicy";
import { dropStaleEdgeJsonLd } from "../utils/edgeJsonLd";

export default function RouteMetadata() {
  const location = useLocation();
  useEffect(() => { dropStaleEdgeJsonLd(location.pathname); }, [location.pathname]);
  const policy = indexPolicy(location.pathname + location.search);
  return policy.utility ? <SEO title={policy.title} description="Artopia-ს მომსახურების გვერდი." noIndex /> : null;
}
