import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
    const { user } = await parent();
    if (user) {
        throw redirect(307, '/dashboard');
    } else {
        throw redirect(307, '/signin');
    }
};
