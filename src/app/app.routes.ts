import { Routes } from '@angular/router';
import { LoginComponent } from './pages/auth/login/login.component';
import { LandingComponent } from './pages/landing/landing.component';
import { PrivateLayoutComponent } from './layouts/private-layout/private-layout.component';
import { PublicLayoutComponent } from './layouts/public-layout/public-layout.component';
import { RegisterComponent } from './pages/auth/register/register.component';
import { DashboardComponent as StudentDashboardComponent} from '@features/student/dashboard/dashboard.component';
import { ProfileComponent as StudentProfileComponent } from '@features/student/profile/profile.component';
import { ChallengeViewComponent } from '@features/student/challenge-view/challenge-view.component';
import { DashboardComponent as TeacherDashboardComponent } from '@features/teacher/dashboard/dashboard.component'
import { ProfileComponent as TeacherProfileComponent } from '@features/teacher/profile/profile.component';

import { roleGuard } from '@core/guards/role.guard';
import { StudentDetailsComponent } from '@features/teacher/student-details/student-details.component';
import { publicGuard } from '@core/guards/public.guard';
import { DashboardComponent as AdminDashboardComponent } from '@features/admin/dashboard/dashboard.component';
import { CatalogsComponent } from '@features/admin/catalogs/catalogs.component';
import { ClassroomsComponent } from '@features/admin/classrooms/classrooms.component';
import { ContentComponent } from '@features/admin/content/content.component';
import { UsersComponent } from '@features/admin/users/users.component';



export const routes: Routes = [

    { path: '', component: PublicLayoutComponent, canActivate:[publicGuard], children: 
        [
            { path: '', component: LandingComponent },
            { path: 'login', component: LoginComponent },
            { path: 'register', component: RegisterComponent },
        ]
    },
    { path: 'student', component: PrivateLayoutComponent, canActivate: [roleGuard], data: { roles: ['estudiante'] }, children: 
        [
            { path: 'dashboard', component: StudentDashboardComponent },
            { path: 'profile', component: StudentProfileComponent},
            { path: 'challenge-view/:id', component: ChallengeViewComponent }
        ]
    },
    { path: 'teacher', component: PrivateLayoutComponent, canActivate: [roleGuard], data: { roles: ['maestro'] }, children: 
        [
            { path: 'dashboard', component: TeacherDashboardComponent },
            { path: 'profile', component: TeacherProfileComponent},
            { path: 'student-details/:id', component: StudentDetailsComponent}
        ]
    },
    { 
        path: 'admin', component: PrivateLayoutComponent, canActivate: [roleGuard], data: { roles: ['admin'] }, children: 
        [
            { path: 'dashboard', component: AdminDashboardComponent },
            { path: 'catalogs', component: CatalogsComponent },
            { path: 'classrooms', component: ClassroomsComponent },
            { path: 'content', component: ContentComponent },
            { path: 'users', component: UsersComponent }
        ]
    },
    { path: '**', redirectTo: '', pathMatch: 'full' }

];
