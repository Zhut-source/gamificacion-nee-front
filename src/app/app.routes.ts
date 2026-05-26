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



export const routes: Routes = [

    { path: '', component: PublicLayoutComponent, children: 
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
            { path: 'challenge-view', component: ChallengeViewComponent}
        ]
    },
    { path: 'teacher', component: PrivateLayoutComponent, canActivate: [roleGuard], data: { roles: ['maestro'] }, children: 
        [
            { path: 'dashboard', component: TeacherDashboardComponent },
            { path: 'profile', component: TeacherProfileComponent},
            { path: 'student-details', component: StudentDetailsComponent}
        ]
    },
    { path: '**', redirectTo: '', pathMatch: 'full' }

];
