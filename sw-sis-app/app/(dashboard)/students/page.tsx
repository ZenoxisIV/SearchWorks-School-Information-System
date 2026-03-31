"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const students = [
  {
    studentNo: "2023001",
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
    birthDate: "2000-01-15",
  },
  {
    studentNo: "2023002",
    firstName: "Jane",
    lastName: "Smith",
    email: "jane.smith@example.com",
    birthDate: "2001-03-22",
  },
  {
    studentNo: "2023003",
    firstName: "Bob",
    lastName: "Johnson",
    email: "bob.johnson@example.com",
    birthDate: "2000-07-10",
  },
];

export default function StudentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Students</h2>
        <p className="text-muted-foreground">Manage student information.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Students</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student No</TableHead>
                <TableHead>First Name</TableHead>
                <TableHead>Last Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Birth Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => (
                <TableRow key={student.studentNo}>
                  <TableCell>{student.studentNo}</TableCell>
                  <TableCell>{student.firstName}</TableCell>
                  <TableCell>{student.lastName}</TableCell>
                  <TableCell>{student.email}</TableCell>
                  <TableCell>{student.birthDate}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}