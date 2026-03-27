"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStaffStore } from "@/lib/staffStore";

export default function StaffRoot() {
  const router = useRouter();

  useEffect(() => {
    // If already logged in, go to dashboard; otherwise login
    const staffId = useStaffStore.getState().staffId;
    router.replace(staffId ? "/staff/dashboard" : "/staff/login");
  }, [router]);

  return null;
}
